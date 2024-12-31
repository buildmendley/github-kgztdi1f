import OpenAI from 'openai';
import { ChatMessage, ChatAnalysis } from '../types/chat';
import { ANALYSIS_PROMPT } from '../prompts/analysis-prompt';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const analyzeChatSession = async (messages: ChatMessage[]): Promise<ChatAnalysis> => {
  try {
    // Format conversation for analysis
    const conversation = messages
      .map(m => `${m.sender.toUpperCase()}: ${m.content}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: ANALYSIS_PROMPT 
        },
        { 
          role: "user", 
          content: `Analyze this conversation and provide insights:\n\n${conversation}` 
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No analysis generated');
    }

    // Parse the analysis text into structured format
    const sections = analysisText.split('\n\n');
    const analysis = {
      headline: sections[0].replace('Headline:', '').trim(),
      analysis: sections[1].replace('Analysis:', '').trim(),
      keyInsight: sections[2].replace('Key Insight:', '').trim(),
      emotions: parseEmotions(sections[3].replace('Emotional Landscape:', '').trim()),
      suggestions: parseSuggestions(sections[4].replace('Suggestions:', '').trim())
    };

    return analysis;
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    throw error;
  }
};

function parseEmotions(emotionsText: string) {
  return emotionsText.split(',').map(emotion => {
    const [emoji, name] = emotion.trim().split(' ');
    return { emoji, name };
  });
}

function parseSuggestions(suggestionsText: string) {
  return suggestionsText
    .split('\n')
    .map(suggestion => suggestion.trim())
    .filter(suggestion => suggestion.length > 0 && suggestion !== '-')
    .map(suggestion => suggestion.startsWith('- ') ? suggestion.slice(2) : suggestion);
}