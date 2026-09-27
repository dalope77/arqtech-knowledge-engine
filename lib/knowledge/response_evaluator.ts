import { CandidateAnswer, KnowledgeScope } from '@/types';
import { getDefaultLLMProvider } from '../llm';

export interface EvaluationMetrics {
  query_fit: number;
  evidence_coverage: number;
  completeness: number;
  user_fit: number;
  depth_fit: number;
  actionability: number;
  uncertainty_handling: number;
  contradiction_handling: number;
  explanation: string;
}

export interface EvaluatedAnswer {
  answer: CandidateAnswer;
  metrics: EvaluationMetrics;
}

export class ResponseEvaluator {
  private llm = getDefaultLLMProvider();

  async evaluateAnswers(
    query: string,
    answers: CandidateAnswer[],
    scope: KnowledgeScope,
    userContext?: any
  ): Promise<EvaluatedAnswer[]> {
    if (!answers || answers.length === 0) return [];

    const evaluated: EvaluatedAnswer[] = [];

    // In a production system, these evaluations could be done in parallel.
    for (const answer of answers) {
      const evaluation = await this.evaluateSingleAnswer(query, answer, scope, userContext);
      evaluated.push({
        answer,
        metrics: evaluation
      });
    }

    return evaluated;
  }

  private async evaluateSingleAnswer(
    query: string,
    answer: CandidateAnswer,
    scope: KnowledgeScope,
    userContext: any
  ): Promise<EvaluationMetrics> {
    const prompt = `
    You are the ArqTech Response Evaluator.
    Your task is to evaluate a candidate answer based on explicit criteria, NOT to score "truth" arbitrarily.

    Context:
    - User Query: "${query}"
    - Perspective/Type: ${answer.perspective}
    - Candidate Answer: "${answer.content}"
    - Evidence Count Available: ${scope.observationIds.length}

    Evaluate on a scale of 0 to 1 (e.g., 0.8) for each metric:
    - query_fit: How well does it address the exact user query?
    - evidence_coverage: Does it utilize the available evidence well without hallucinating?
    - completeness: Is it comprehensive for its perspective?
    - user_fit: Does it fit the intended audience?
    - depth_fit: Is the depth appropriate?
    - actionability: Can the user take action based on this?
    - uncertainty_handling: Does it properly acknowledge what it does not know?
    - contradiction_handling: Does it resolve or clearly state contradictions if any exist?

    Return a JSON object:
    {
      "query_fit": 0.0,
      "evidence_coverage": 0.0,
      "completeness": 0.0,
      "user_fit": 0.0,
      "depth_fit": 0.0,
      "actionability": 0.0,
      "uncertainty_handling": 0.0,
      "contradiction_handling": 0.0,
      "explanation": "A short, explainable rationale for these scores."
    }
    `;

    try {
      const response = await this.llm.generateContent([
        { role: 'system', content: 'You are a precise evaluation engine.' },
        { role: 'user', content: prompt }
      ], { response_format: { type: 'json_object' } });

      const text = response.text || '{}';
      const match = text.match(/\{[\s\S]*\}/);
      const cleaned = match ? match[0] : '{}';
      const metrics = JSON.parse(cleaned);
      return {
        query_fit: metrics.query_fit || 0,
        evidence_coverage: metrics.evidence_coverage || 0,
        completeness: metrics.completeness || 0,
        user_fit: metrics.user_fit || 0,
        depth_fit: metrics.depth_fit || 0,
        actionability: metrics.actionability || 0,
        uncertainty_handling: metrics.uncertainty_handling || 0,
        contradiction_handling: metrics.contradiction_handling || 0,
        explanation: metrics.explanation || 'Evaluated successfully.'
      };
    } catch (e) {
      console.warn('Response evaluation failed, using fallback metrics.', e);
      return {
        query_fit: 0.5,
        evidence_coverage: 0.5,
        completeness: 0.5,
        user_fit: 0.5,
        depth_fit: 0.5,
        actionability: 0.5,
        uncertainty_handling: 0.5,
        contradiction_handling: 0.5,
        explanation: 'Fallback evaluation due to system error.'
      };
    }
  }
}
