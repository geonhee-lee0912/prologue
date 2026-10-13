/**
 * 갈피 평가 세트를 진짜 LLM 으로 돌린다 — 프롬프트를 고친 뒤 사람이 직접 실행한다(비용이 들어 CI 에서 돌리지 않는다).
 * 실행: corepack pnpm --filter shared build && OPENAI_API_KEY=... corepack pnpm --filter api exec tsx scripts/galpi-eval.ts
 * 시나리오 하나에 호출 한 번(purpose 'eval'). 대화는 지어낸 예시라 실제 사용자 정보가 나가지 않는다
 */
import { EVAL_SCENARIOS, judgeScenario } from '../src/galpi/eval/scenarios';
import { buildReplyMessages } from '../src/galpi/prompt/reply-prompt';
import { parseReply } from '../src/galpi/reply';
import { OpenAiLlmService } from '../src/infra/openai-llm.service';

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY 가 필요합니다.');
    process.exit(1);
  }
  const llm = new OpenAiLlmService(apiKey, process.env.LLM_MODEL || 'gpt-5.6-luna');
  let failed = 0;
  for (const scenario of EVAL_SCENARIOS) {
    const result = await llm.complete({
      purpose: 'eval',
      messages: buildReplyMessages(scenario.input),
      responseFormat: 'json',
      maxOutputTokens: 400,
    });
    const reply = parseReply(result.content);
    const issues = judgeScenario(scenario, reply);
    if (issues.length > 0) failed += 1;
    console.log(`${issues.length ? 'FAIL' : 'ok  '} ${scenario.id} — ${scenario.title}`);
    for (const issue of issues) console.log(`     · ${issue}`);
    for (const bubble of reply?.bubbles ?? []) console.log(`     갈피: ${bubble.text}`);
  }
  console.log(`\n${EVAL_SCENARIOS.length - failed}/${EVAL_SCENARIOS.length} 통과`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();
