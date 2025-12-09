import { adjectives, nouns, primingAngles, functionalTemplates, hypotheticalTemplates, oppositeTemplates } from './data.js';
import { state } from './state.js';

export function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export function getArticle(word) {
    const cleanWord = word.replace(/<\/?strong>/g, ''); 
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    if (cleanWord.length === 0) return 'a'; 
    return vowels.includes(cleanWord[0].toLowerCase()) ? 'an' : 'a';
}

export function getPrimeAngle(isOpposite, promptType) {
    let category;
    if (state.isBrutalMode || isOpposite) {
        category = primingAngles.opposite;
    } else if (promptType === 'functional') {
        category = primingAngles.functional;
    } else if (promptType === 'hypothetical') {
        category = primingAngles.hypothetical;
    } else {
        category = Math.random() < 0.5 ? primingAngles.functional : primingAngles.hypothetical;
    }
    
    return category[Math.floor(Math.random() * category.length)];
}

export function generateConnectPrompt() {
    const noun1 = nouns[Math.floor(Math.random() * nouns.length)];
    let noun2 = nouns[Math.floor(Math.random() * nouns.length)];
    
    while (noun1 === noun2) {
        noun2 = nouns[Math.floor(Math.random() * nouns.length)];
    }
    
    const text = `Connect <strong>${noun1}</strong> and <strong>${noun2}</strong>. Find a link, a shared use, or combine them!`;
    return { text: text, type: 'functional' };
}

export function generatePromptText(isOpposite, promptType) {
    let selectedTemplates = [];
    let finalPromptType;

    if (isOpposite) {
        selectedTemplates = oppositeTemplates;
        finalPromptType = 'opposite';
    } else {
        if (promptType === 'functional') {
            selectedTemplates = functionalTemplates;
            finalPromptType = 'functional';
        } else if (promptType === 'hypothetical') {
            selectedTemplates = hypotheticalTemplates;
            finalPromptType = 'hypothetical';
        } else { // 'all'
            if (Math.random() < 0.5) {
                selectedTemplates = functionalTemplates;
                finalPromptType = 'functional';
            } else {
                selectedTemplates = hypotheticalTemplates;
                finalPromptType = 'hypothetical';
            }
        }
    }

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    let result = selectedTemplates[Math.floor(Math.random() * selectedTemplates.length)];

    result = result.replace('{adj_word}', `<strong>${adj}</strong>`)
                   .replace('{noun_word}', `<strong>${noun}</strong>`);

    result = result.replace(/\{a\/an\}/g, (match, offset) => {
        const subsequentString = result.substring(offset + match.length).trim();
        const nextWordMatch = subsequentString.match(/^([\w<>/]+)/);
        if (nextWordMatch && nextWordMatch[1]) {
            return getArticle(nextWordMatch[1]);
        }
        return 'a'; 
    });
    
    return { text: result, type: finalPromptType };
}
