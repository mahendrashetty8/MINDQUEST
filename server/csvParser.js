// server/csvParser.js
// Parser for Question Bank CSV uploads
import Papa from 'papaparse';

export function parseCsvContent(csvString) {
  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  });

  const parsed = [];

  result.data.forEach((row, index) => {
    // Normalizing column names to handle variations
    const keys = Object.keys(row);
    const getVal = (possibleNames) => {
      for (const name of possibleNames) {
        const foundKey = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
        if (foundKey && row[foundKey] !== undefined) {
          return String(row[foundKey]).trim();
        }
      }
      return "";
    };

    const questionText = getVal(["question text", "question", "q text", "text", "prompt"]);
    const optA = getVal(["option a", "opt a", "optiona", "a", "a)"]);
    const optB = getVal(["option b", "opt b", "optionb", "b", "b)"]);
    const optC = getVal(["option c", "opt c", "optionc", "c", "c)"]);
    const optD = getVal(["option d", "opt d", "optiond", "d", "d)"]);
    const ans = getVal(["correct answer", "answer", "ans", "correct", "key"]).toUpperCase();
    const category = getVal(["category", "topic", "subject"]) || "General";

    const issues = [];
    if (!questionText || questionText.length < 5) issues.push("Missing question text");
    if (!optA) issues.push("Missing option A");
    if (!optB) issues.push("Missing option B");
    if (!optC) issues.push("Missing option C");
    if (!optD) issues.push("Missing option D");
    if (!['A', 'B', 'C', 'D'].includes(ans)) issues.push("Answer must be A, B, C, or D");

    parsed.push({
      id: `q_csv_${Date.now()}_${index + 1}_${Math.random().toString(36).substring(2, 6)}`,
      originalNumber: index + 1,
      question: questionText || `Row ${index + 1}`,
      options: {
        A: optA,
        B: optB,
        C: optC,
        D: optD
      },
      answer: ans,
      category,
      isValid: issues.length === 0,
      issues
    });
  });

  return parsed;
}
