import OpenAI from 'openai';
import { Contribution } from './parsePaystub';
import { PaystubRecord } from '../types';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function getAiResponse(entries: Contribution[], paystubs: PaystubRecord[], question: string): Promise<string> {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    return "OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file.";
  }

  if (!entries.length && !paystubs.length) {
    return "You don't have any investment data yet. Please upload a paystub first, then ask your question.";
  }

  const formattedEntries = entries
    .map(e => `${e.payDate}: Type=${e.type}, Employee=${e.employee}, Employer=${e.employer}`)
    .join('\n');

  const formattedStubs = paystubs
    .map(p => {
      const taxes = [
        p.taxFederal?.cur ?? 0,
        p.taxState?.cur ?? 0,
        p.taxCity?.cur ?? 0,
        p.taxSocialSecurity?.cur ?? 0,
        p.taxMedicare?.cur ?? 0,
      ].reduce((a, b) => a + b, 0);
      return `${p.payDate} GrossCur=${p.gross.cur} NetCur=${p.net.cur} TaxesCur=${taxes}`;
    })
    .join('\n');

  const systemPrompt = `You are a helpful financial assistant. The user will provide you with a list of their investment contributions and a question.\n\n` +
    `Here are the user's contribution lines:\n${formattedEntries}\n\n` +
    `Here are per-paycheck gross/net/taxes lines:\n${formattedStubs}\n\n` +
    `RULES:\n` +
    `- When calculating "Total Compensation" for a period, sum Employee and Employer amounts for all relevant entries.\n` +
    `- When asked for projections or annualised totals, assume the data provided is representative and scale to a full year.\n` +
    `- Be clear and concise. If calculations are required, show them.\n` +
    `- If the data is empty or insufficient, state that clearly.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: 0.2,
    });
    return response.choices[0].message.content ?? "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "Sorry, I encountered an error while trying to generate a response.";
  }
} 