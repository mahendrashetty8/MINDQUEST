// server/pdfParser.js
// Robust parser for competition question bank PDFs and raw text
import pdfParse from 'pdf-parse';

export async function parsePdfBuffer(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text || '';
  return parseQuestionText(text);
}

function cleanString(str) {
  if (!str) return '';
  return str
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function parseQuestionText(text) {
  // Normalize Windows line endings and common typographical artifacts
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, ' ');

  // Split into candidate question blocks.
  // Questions typically start with Q1., Q1), Q 1., or 1. at beginning of line or following newlines
  const questionRegex = /(?:^|\n)\s*(?:Q\.?\s*(\d+)|(\d+))\s*[.)]\s*([\s\S]*?)(?=(?:\n\s*(?:Q\.?\s*\d+|\d+)\s*[.)])|$)/gi;

  const rawBlocks = [];
  let match;
  while ((match = questionRegex.exec(cleanText)) !== null) {
    const qNum = match[1] || match[2] || (rawBlocks.length + 1).toString();
    const content = match[3].trim();
    rawBlocks.push({ originalNumber: parseInt(qNum, 10) || (rawBlocks.length + 1), content });
  }

  // Fallback: If no standard Q1. pattern was matched, try splitting by Answer: occurrences
  if (rawBlocks.length === 0) {
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    let currentBlock = [];
    let counter = 1;
    for (const line of lines) {
      currentBlock.push(line);
      if (/^(?:Answer|Ans|Correct)\s*[:\-]\s*[A-D]/i.test(line)) {
        rawBlocks.push({ originalNumber: counter++, content: currentBlock.join('\n') });
        currentBlock = [];
      }
    }
  }

  const parsedQuestions = rawBlocks.map((block, index) => {
    return parseSingleQuestionBlock(block.content, block.originalNumber, index + 1);
  });

  return parsedQuestions;
}

function parseSingleQuestionBlock(rawContent, originalNumber, index) {
  const issues = [];
  let questionText = "";
  const options = { A: "", B: "", C: "", D: "" };
  let answer = "";
  let category = "General";

  // Look for Answer: X
  const answerRegex = /(?:Answer|Ans|Correct(?:\s*Answer)?)\s*[:\-]\s*([A-D])/i;
  const answerMatch = rawContent.match(answerRegex);
  if (answerMatch) {
    answer = answerMatch[1].toUpperCase();
  } else {
    issues.push("Missing or invalid Answer (e.g. 'Answer: B')");
  }

  // Look for optional Category: XYZ
  const categoryMatch = rawContent.match(/(?:Category|Topic)\s*[:\-]\s*([^\n]+)/i);
  if (categoryMatch) {
    category = cleanString(categoryMatch[1]);
  }

  // Content before the Answer line
  let beforeAnswer = rawContent;
  if (answerMatch) {
    beforeAnswer = rawContent.substring(0, answerMatch.index);
  }

  // Find options A), B), C), D) or A. B. C. D.
  const optRegex = /(?:^|\s|\n)(?:\(?([A-D])\)[.]?|([A-D])\.)\s+/g;
  const optMatches = [];
  let optM;
  while ((optM = optRegex.exec(beforeAnswer)) !== null) {
    const key = (optM[1] || optM[2]).toUpperCase();
    optMatches.push({
      key,
      startIndex: optM.index,
      contentStart: optM.index + optM[0].length
    });
  }

  if (optMatches.length >= 2) {
    // Question text is everything before the first option marker
    questionText = beforeAnswer.substring(0, optMatches[0].startIndex).trim();
    // Clean up any remaining leading "Q1." in questionText if present
    questionText = questionText.replace(/^(?:Q\.?\s*\d+\s*[.)\-:]\s*)/i, '').trim();

    // Extract each option segment
    for (let i = 0; i < optMatches.length; i++) {
      const current = optMatches[i];
      const nextStart = (i + 1 < optMatches.length) ? optMatches[i + 1].startIndex : beforeAnswer.length;
      const textVal = beforeAnswer.substring(current.contentStart, nextStart).trim();
      if (['A', 'B', 'C', 'D'].includes(current.key)) {
        options[current.key] = cleanString(textVal);
      }
    }
  } else {
    questionText = beforeAnswer.replace(/^(?:Q\.?\s*\d+\s*[.)\-:]\s*)/i, '').trim();
    issues.push("Options (A, B, C, D) could not be detected accurately");
  }

  // Check which options are missing
  ['A', 'B', 'C', 'D'].forEach(opt => {
    if (!options[opt] || options[opt].trim() === "") {
      issues.push(`Missing option ${opt}`);
    }
  });

  questionText = cleanString(questionText);
  if (!questionText || questionText.length < 5) {
    issues.push("Question text is empty or too short");
  }

  const isValid = issues.length === 0;

  return {
    id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
    originalNumber: originalNumber || index,
    question: questionText || "Unparsed question",
    options,
    answer: answer || "",
    category: category || "General",
    isValid,
    issues
  };
}
