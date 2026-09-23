/**
 * Automated Test Suite for Snacke LIVE
 * Tests:
 * 1. Webhook Authentication & Secret Rejection
 * 2. Webhook Deduplication & Anti-Fraud (eventId)
 * 3. Heartbeat Processing
 * 4. Snake AI BFS Pathfinding & Dead-End Safety Checks
 * 5. Isolation of Synthetic Test Events (Never increments realGiftEvents)
 */

import assert from 'assert';
import { serverState } from '../backend/state.ts';
import { validateGiftPayload, verifyTermuxAuth } from '../backend/webhook.ts';
import { evaluateGiftReward } from '../shared/gifts.ts';
import { calculateReachableSpace, determineNextMove, findShortestPath } from '../src/game/pathfinder.ts';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Erro: ${err.message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('🧪 Executando Testes Unitários de Snacke LIVE');
console.log('====================================================\n');

// 1. Testes de Autenticação do Webhook
console.log('--- 1. Autenticação & Segurança Termux -> Backend ---');

runTest('Rejeita requisição sem token de autenticação', () => {
  const req: any = { headers: {}, body: {} };
  const authorized = verifyTermuxAuth(req);
  assert.strictEqual(authorized, false, 'Deveria rejeitar requisição sem auth');
});

runTest('Rejeita requisição com Bearer token incorreto', () => {
  const req: any = {
    headers: { authorization: 'Bearer token_invalido_123' },
    body: {},
  };
  const authorized = verifyTermuxAuth(req);
  assert.strictEqual(authorized, false, 'Deveria rejeitar token incorreto');
});

runTest('Aceita requisição com Bearer token válido', () => {
  const secret = process.env.TERMUX_WEBHOOK_SECRET || 'rainz878_snacke_secret_replace_me';
  const req: any = {
    headers: { authorization: `Bearer ${secret}` },
    body: {},
  };
  const authorized = verifyTermuxAuth(req);
  assert.strictEqual(authorized, true, 'Deveria aceitar Bearer token correto');
});

runTest('Aceita requisição com cabeçalho X-Webhook-Secret válido', () => {
  const secret = process.env.TERMUX_WEBHOOK_SECRET || 'rainz878_snacke_secret_replace_me';
  const req: any = {
    headers: { 'x-webhook-secret': secret },
    body: {},
  };
  const authorized = verifyTermuxAuth(req);
  assert.strictEqual(authorized, true, 'Deveria aceitar X-Webhook-Secret correto');
});

// 2. Testes de Validação e Deduplicação
console.log('\n--- 2. Validação de Payload & Deduplicação de Presentes ---');

runTest('Valida formato correto de payload de presente', () => {
  const validPayload = {
    event: 'gift',
    eventId: 'evt_test_101',
    username: 'apoiador_real',
    nickname: 'Apoiador',
    giftId: '5655',
    giftName: 'Rose',
    giftCount: 5,
    diamondCount: 5,
    timestamp: Date.now(),
  };

  const res = validateGiftPayload(validPayload);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.data?.eventId, 'evt_test_101');
  assert.strictEqual(res.data?.giftCount, 5);
});

runTest('Rejeita payload com campos obrigatórios ausentes', () => {
  const invalidPayload = {
    event: 'gift',
    // missing eventId
    username: 'apoiador',
    giftName: 'Rose',
  };

  const res = validateGiftPayload(invalidPayload);
  assert.strictEqual(res.valid, false);
});

runTest('Deduplica presentes com mesmo eventId para evitar dupla recompensa', () => {
  const testEventId = 'unique_event_test_555';

  assert.strictEqual(serverState.isDuplicateEvent(testEventId), false);
  serverState.markEventProcessed(testEventId);
  // Segunda tentativa deve ser detectada como duplicata!
  assert.strictEqual(serverState.isDuplicateEvent(testEventId), true);
});

// 3. Regras de Recompensa de Presentes
console.log('\n--- 3. Avaliação de Recompensas de Presentes ---');

runTest('Rosa (5655) concede 2 maçãs regulares por unidade', () => {
  const reward = evaluateGiftReward('5655', 'Rose', 1, 1);
  assert.strictEqual(reward.applesToAdd, 2);
  assert.strictEqual(reward.bannerEmoji, '🌹');
});

runTest('Rosquinha (5827) concede 6 maçãs + efeito de velocidade', () => {
  const reward = evaluateGiftReward('5827', 'Donut', 1, 30);
  assert.strictEqual(reward.applesToAdd, 6);
  assert.strictEqual(reward.effectType, 'speed');
  assert.strictEqual(reward.bannerEmoji, '🍩');
});

runTest('Galáxia (5656) ativa super evento cósmico', () => {
  const reward = evaluateGiftReward('5656', 'Galaxy', 1, 1000);
  assert.strictEqual(reward.applesToAdd, 20);
  assert.strictEqual(reward.goldenApplesToAdd, 5);
  assert.strictEqual(reward.galaxyApplesToAdd, 3);
  assert.strictEqual(reward.effectType, 'galaxy');
  assert.strictEqual(reward.bannerEmoji, '🌌');
});

// 4. Testes de IA e Pathfinding da Cobra
console.log('\n--- 4. Inteligência Artificial da Cobra (BFS & Segurança) ---');

runTest('Encontra menor caminho desobstruído até a maçã', () => {
  const start = { x: 5, y: 5 };
  const target = { x: 8, y: 5 };
  const obstacles = new Set<number>();
  const path = findShortestPath(start, target, obstacles, 20, 20);

  assert.ok(path !== null, 'Deveria encontrar caminho');
  assert.strictEqual(path.length, 3, 'Distância em linha reta deve ser 3 passos');
  assert.deepStrictEqual(path[path.length - 1], target);
});

runTest('Desvia de obstáculos (corpo da cobra)', () => {
  const start = { x: 5, y: 5 };
  const target = { x: 7, y: 5 };
  // Obstáculo diretamente no meio em (6, 5)
  const obstacles = new Set<number>([5 * 20 + 6]);
  const path = findShortestPath(start, target, obstacles, 20, 20);

  assert.ok(path !== null, 'Deveria contornar o obstáculo');
  // O caminho deve desviar acima ou abaixo
  assert.ok(path.length > 2, 'Caminho com desvio deve ter mais de 2 passos');
  assert.deepStrictEqual(path[path.length - 1], target);
});

runTest('Cálculo de flood-fill avalia espaço livre disponível', () => {
  const start = { x: 1, y: 1 };
  const obstacles = new Set<number>();
  const freeSpace = calculateReachableSpace(start, obstacles, 10, 10, 50);
  assert.ok(freeSpace > 10, 'Espaço livre deve ser amplo em arena vazia');
});

runTest('IA decide próximo passo sem colidir com as paredes', () => {
  const next = determineNextMove({
    cols: 20,
    rows: 20,
    snake: [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ],
    apples: [
      {
        id: 'apple_1',
        x: 10,
        y: 8,
        type: 'regular',
        points: 10,
        createdAt: Date.now(),
        color: '#ef4444',
      },
    ],
  });

  assert.ok(next !== null);
  // Próximo passo seguro em direção à maçã em y=8 deve ser y=9
  assert.strictEqual(next.x, 10);
  assert.strictEqual(next.y, 9);
});

// 5. Isolamento de Eventos Sintéticos
console.log('\n--- 5. Isolamento de Eventos de Teste (Regra de Ouro) ---');

runTest('Eventos sintéticos de teste NÃO incrementam realGiftEvents', () => {
  const initialRealGifts = serverState.getStatus().realGiftEvents;

  serverState.trackGiftEvent(
    {
      event: 'gift',
      eventId: 'synthetic_dev_test_999',
      username: 'bot_teste',
      nickname: 'Bot',
      giftId: '5655',
      giftName: 'Rosa',
      giftCount: 1,
      diamondCount: 1,
      timestamp: Date.now(),
      isSynthetic: true, // FLAG SINTÉTICA
    },
    1
  );

  const finalRealGifts = serverState.getStatus().realGiftEvents;
  assert.strictEqual(
    finalRealGifts,
    initialRealGifts,
    'Eventos sintéticos NUNCA devem incrementar realGiftEvents!'
  );
});

// 6. Testes do Sistema de Crescimento Progressivo
console.log('\n--- 6. Sistema de Crescimento Progressivo & Limite Seguro ---');

runTest('Calcula limites máximos seguros dinamicamente conforme dimensões da arena', async () => {
  const { SnakeGameEngine } = await import('../src/game/engine.ts');
  const engine = new SnakeGameEngine({ cols: 30, rows: 44 });

  const maxSafe = engine.getMaxSafeLength();
  const threshold70 = engine.getThreshold70();

  assert.strictEqual(maxSafe, Math.floor(30 * 44 * 0.38)); // ~501
  assert.strictEqual(threshold70, Math.floor(maxSafe * 0.70)); // ~350
  assert.ok(threshold70 < maxSafe, '70% deve ser estritamente menor que o limite máximo');
});

runTest('Crescimento normal até 70% e desaceleração progressiva (20 maçãs = +1%) após 70%', async () => {
  const { SnakeGameEngine } = await import('../src/game/engine.ts');
  const engine = new SnakeGameEngine({ cols: 20, rows: 20 });
  // Para 20x20 = 400 células: maxSafe = 152, threshold70 = 106
  const maxSafe = engine.getMaxSafeLength();
  const threshold70 = engine.getThreshold70();

  // Simula a cobra atingindo o limiar de 70%
  engine.snake = new Array(threshold70).fill({ x: 5, y: 5 });
  engine.growthPending = 0;
  engine.post70ApplesCount = 0;

  const mockApple = {
    id: 'test_apple',
    x: 5,
    y: 5,
    type: 'regular' as const,
    points: 10,
    createdAt: Date.now(),
    color: '#ef4444',
  };

  const initialScore = engine.score;

  // Come 19 maçãs além de 70%
  for (let i = 0; i < 19; i++) {
    (engine as any).handleAppleEaten(mockApple, { x: 5, y: 5 });
    // Pontuação DEVE aumentar sempre
    assert.strictEqual(engine.applesCollected, i + 1);
    assert.strictEqual(engine.score, initialScore + (i + 1) * 10);
    // Mas growthPending ainda DEVE ser 0
    assert.strictEqual(engine.growthPending, 0, `Não deve crescer na maçã ${i + 1}`);
  }

  // Na 20ª maçã, deve conceder +1% de maxSafe
  (engine as any).handleAppleEaten(mockApple, { x: 5, y: 5 });
  const expected1PctGrowth = Math.max(1, Math.round(maxSafe * 0.01));
  assert.strictEqual(engine.growthPending, expected1PctGrowth, '20ª maçã deve liberar crescimento de +1%');
  assert.strictEqual(engine.post70ApplesCount, 0, 'Contador de maçãs pós-70% deve reiniciar');
});

// 7. Testes de IA Avançada: Modo Sobrevivência, Alerta e Rastreamento de Alvo
console.log('\n--- 7. IA Avançada, Modo Sobrevivência & Novas Maçãs ---');

runTest('IA identifica maçã alvo e detecta modo de sobrevivência quando encurralada', async () => {
  const { decideAIMove } = await import('../src/game/pathfinder.ts');
  const cols = 20;
  const rows = 20;

  // Maçã livre à frente
  const openResult = decideAIMove({
    cols,
    rows,
    snake: [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 5, y: 7 },
    ],
    apples: [
      {
        id: 'apple_1',
        x: 5,
        y: 2,
        type: 'regular',
        points: 10,
        createdAt: Date.now(),
        color: '#ef4444',
      },
    ],
  });

  assert.ok(openResult.nextMove !== null, 'Deve encontrar próximo passo seguro');
  assert.strictEqual(openResult.targetApple?.id, 'apple_1', 'Deve apontar para a maçã alvo');
  assert.strictEqual(openResult.isSurvivalMode, false, 'Não deve estar em modo sobrevivência');
});

runTest('Suporta novos tipos de maçãs: special_green e giant', async () => {
  const { SnakeGameEngine } = await import('../src/game/engine.ts');
  const engine = new SnakeGameEngine({ cols: 32, rows: 48 });

  engine.spawnGiantApple();
  const giant = engine.apples.find((a) => a.type === 'giant');
  assert.ok(giant, 'Deve gerar maçã gigante com sucesso');
  assert.strictEqual(giant.points, 250);
  assert.strictEqual(giant.sizeMultiplier, 1.8);
});

console.log('\n====================================================');
console.log(`📊 Resultado dos Testes: ${passed} passaram | ${failed} falharam`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
