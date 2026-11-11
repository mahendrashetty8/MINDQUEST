// scripts/generate-sample-pdf.js
// Generates sample question bank in both PDF and CSV formats
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDir = path.join(__dirname, '..', 'sample');

if (!fs.existsSync(sampleDir)) {
  fs.mkdirSync(sampleDir, { recursive: true });
}

export const SAMPLE_QUESTIONS = [
  {
    id: 1,
    question: "What is the primary function of the Central Processing Unit (CPU) in a computer system?",
    options: {
      A: "Long-term data archiving",
      B: "Instruction execution and arithmetic logic",
      C: "Digital-to-analog audio conversion",
      D: "Power regulation across motherboard circuits"
    },
    answer: "B",
    category: "Computer Science"
  },
  {
    id: 2,
    question: "Which data structure uses the First In, First Out (FIFO) principle for element access?",
    options: {
      A: "Stack",
      B: "Binary Search Tree",
      C: "Queue",
      D: "Max Heap"
    },
    answer: "C",
    category: "Data Structures"
  },
  {
    id: 3,
    question: "What is the worst-case time complexity of standard QuickSort with poor pivot selection?",
    options: {
      A: "O(n log n)",
      B: "O(n^2)",
      C: "O(n)",
      D: "O(log n)"
    },
    answer: "B",
    category: "Algorithms"
  },
  {
    id: 4,
    question: "In relational databases, which normal form eliminates transitive dependencies?",
    options: {
      A: "First Normal Form (1NF)",
      B: "Second Normal Form (2NF)",
      C: "Third Normal Form (3NF)",
      D: "Boyce-Codd Normal Form (BCNF)"
    },
    answer: "C",
    category: "Databases"
  },
  {
    id: 5,
    question: "Which cryptographic protocol operates at the Transport Layer of the OSI model to secure internet traffic?",
    options: {
      A: "IPsec",
      B: "TLS (Transport Layer Security)",
      C: "SSH",
      D: "PGP"
    },
    answer: "B",
    category: "Cybersecurity"
  },
  {
    id: 6,
    question: "What does the ACID acronym stand for in transactional database management?",
    options: {
      A: "Atomicity, Consistency, Isolation, Durability",
      B: "Accuracy, Concurrency, Indexing, Distribution",
      C: "Asynchronous, Cached, Idempotent, Decoupled",
      D: "Allocation, Clustering, Integrity, Duplication"
    },
    answer: "A",
    category: "Databases"
  },
  {
    id: 7,
    question: "Which sorting algorithm is guaranteed to be stable and has O(n log n) worst-case time complexity?",
    options: {
      A: "HeapSort",
      B: "MergeSort",
      C: "QuickSort",
      D: "Selection Sort"
    },
    answer: "B",
    category: "Algorithms"
  },
  {
    id: 8,
    question: "In modern operating systems, what is thrashing caused by?",
    options: {
      A: "Corrupted file allocation tables",
      B: "Excessive page swapping between RAM and secondary storage",
      C: "CPU overheating leading to thermal throttling",
      D: "Deadlocks in multi-threaded mutex acquisition"
    },
    answer: "B",
    category: "Operating Systems"
  },
  {
    id: 9,
    question: "Which HTTP status code signifies that a resource has been permanently moved to a new URI?",
    options: {
      A: "301 Moved Permanently",
      B: "302 Found",
      C: "304 Not Modified",
      D: "307 Temporary Redirect"
    },
    answer: "A",
    category: "Web Architecture"
  },
  {
    id: 10,
    question: "What is the principal benefit of using an immutable data structure in concurrent programming?",
    options: {
      A: "Faster memory allocation on the stack",
      B: "Elimination of race conditions without lock contention",
      C: "Smaller footprint inside CPU cache lines",
      D: "Automatic compilation to GPU shaders"
    },
    answer: "B",
    category: "Software Engineering"
  },
  {
    id: 11,
    question: "Which graph traversal algorithm uses a queue and finds the shortest path on unweighted graphs?",
    options: {
      A: "Depth-First Search (DFS)",
      B: "Breadth-First Search (BFS)",
      C: "Floyd-Warshall Algorithm",
      D: "Bellman-Ford Algorithm"
    },
    answer: "B",
    category: "Algorithms"
  },
  {
    id: 12,
    question: "What is the primary objective of a Reverse Proxy like NGINX in web infrastructure?",
    options: {
      A: "Filter outgoing corporate internet browsing requests",
      B: "Distribute incoming client requests, terminate SSL, and cache static assets",
      C: "Execute complex relational database queries in memory",
      D: "Generate client-side JavaScript bundles dynamically"
    },
    answer: "B",
    category: "Web Architecture"
  },
  {
    id: 13,
    question: "Which memory region in a program's runtime memory is managed dynamically via malloc/free or new/delete?",
    options: {
      A: "Call Stack",
      B: "Heap",
      C: "Data Segment",
      D: "Text/Code Segment"
    },
    answer: "B",
    category: "Systems Programming"
  },
  {
    id: 14,
    question: "In public-key cryptography (e.g. RSA), which key is used by the recipient to decrypt a confidential message?",
    options: {
      A: "Sender's Public Key",
      B: "Sender's Private Key",
      C: "Recipient's Public Key",
      D: "Recipient's Private Key"
    },
    answer: "D",
    category: "Cybersecurity"
  },
  {
    id: 15,
    question: "What is the purpose of an Index in a relational SQL database?",
    options: {
      A: "Enforce foreign key constraints across tables",
      B: "Accelerate data retrieval at the cost of additional storage and write overhead",
      C: "Automatically compress old archival records",
      D: "Encrypt sensitive tabular columns at rest"
    },
    answer: "B",
    category: "Databases"
  },
  {
    id: 16,
    question: "Which principle of object-oriented design states that software entities should be open for extension but closed for modification?",
    options: {
      A: "Single Responsibility Principle",
      B: "Open/Closed Principle",
      C: "Liskov Substitution Principle",
      D: "Dependency Inversion Principle"
    },
    answer: "B",
    category: "Software Engineering"
  },
  {
    id: 17,
    question: "What is the time complexity to find an element in a balanced Binary Search Tree containing n nodes?",
    options: {
      A: "O(1)",
      B: "O(log n)",
      C: "O(n)",
      D: "O(n log n)"
    },
    answer: "B",
    category: "Data Structures"
  },
  {
    id: 18,
    question: "In TCP/IP networking, what mechanism is used to establish a reliable connection between client and server?",
    options: {
      A: "Two-way handshake",
      B: "Three-way handshake (SYN, SYN-ACK, ACK)",
      C: "Four-way tear down",
      D: "UDP broadcast strobe"
    },
    answer: "B",
    category: "Networking"
  },
  {
    id: 19,
    question: "What does the CAP theorem state regarding distributed data stores during network partitions?",
    options: {
      A: "A system can achieve both Consistency and High Availability simultaneously without sacrifice",
      B: "A system must trade off between Consistency and Availability during a partition",
      C: "Distributed latency is inversely proportional to cluster bandwidth",
      D: "Partitioning causes immediate data loss in all replica nodes"
    },
    answer: "B",
    category: "Distributed Systems"
  },
  {
    id: 20,
    question: "Which hashing algorithm generates a 256-bit fixed-length cryptographic digest?",
    options: {
      A: "MD5",
      B: "SHA-1",
      C: "SHA-256",
      D: "CRC32"
    },
    answer: "C",
    category: "Cybersecurity"
  },
  {
    id: 21,
    question: "In Git version control, which command creates and switches to a new branch in a single step?",
    options: {
      A: "git branch -d new-feature",
      B: "git checkout -b new-feature",
      C: "git merge --squash new-feature",
      D: "git rebase new-feature"
    },
    answer: "B",
    category: "DevOps & Tools"
  },
  {
    id: 22,
    question: "What is the primary role of Docker containers in modern deployment pipelines?",
    options: {
      A: "Emulate entire guest operating systems and virtual hardware",
      B: "Package code and its dependencies into lightweight, isolated OS-level containers",
      C: "Provide physical CPU virtualization using hypervisor BIOS flags",
      D: "Replace the host OS kernel with a microkernel"
    },
    answer: "B",
    category: "DevOps & Tools"
  },
  {
    id: 23,
    question: "Which programming language paradigm treats computation as the evaluation of mathematical functions avoiding mutable state?",
    options: {
      A: "Procedural Programming",
      B: "Imperative Programming",
      C: "Functional Programming",
      D: "Object-Oriented Programming"
    },
    answer: "C",
    category: "Programming Languages"
  },
  {
    id: 24,
    question: "What is the purpose of the Domain Name System (DNS) on the internet?",
    options: {
      A: "Encrypt packet payloads across wireless routers",
      B: "Translate human-friendly domain names to numerical IP addresses",
      C: "Synchronize local machine clocks with atomic time standards",
      D: "Assign MAC addresses to Ethernet network cards"
    },
    answer: "B",
    category: "Networking"
  },
  {
    id: 25,
    question: "What is a major advantage of WebAssembly (Wasm) in modern browsers?",
    options: {
      A: "Completely replaces CSS for styling webpages",
      B: "Executes compact binary code at near-native execution speed",
      C: "Bypasses browser cross-origin security sandboxes",
      D: "Provides native direct access to system disk drives without permission"
    },
    answer: "B",
    category: "Web Architecture"
  },
  {
    id: 26,
    question: "Which data structure is fundamentally utilized to implement recursive function call frames in computers?",
    options: {
      A: "Call Stack",
      B: "FIFO Queue",
      C: "Priority Queue",
      D: "Adjacency Matrix"
    },
    answer: "A",
    category: "Systems Programming"
  },
  {
    id: 27,
    question: "What is the mathematical definition of a Prime Number?",
    options: {
      A: "Any number that cannot be divided by 2",
      B: "A positive integer greater than 1 having exactly two positive divisors: 1 and itself",
      C: "Any non-negative integer resulting from the square of a natural number",
      D: "Any real number that can be expressed as a ratio of two integers"
    },
    answer: "B",
    category: "Mathematics"
  },
  {
    id: 28,
    question: "Which fundamental quantum computing unit replaces the classical binary bit?",
    options: {
      A: "Trit",
      B: "Qubit (Quantum Bit)",
      C: "Femtobit",
      D: "Nanobit"
    },
    answer: "B",
    category: "Emerging Tech"
  },
  {
    id: 29,
    question: "What is the primary role of a Content Delivery Network (CDN)?",
    options: {
      A: "Perform transactional database rollbacks",
      B: "Cache web assets geographically closer to users to reduce latency",
      C: "Compile TypeScript source files into native machine code",
      D: "Manage Kubernetes cluster node autoscaling"
    },
    answer: "B",
    category: "Web Architecture"
  },
  {
    id: 30,
    question: "In machine learning, what term describes a model learning noise and memorizing training data rather than generalizing?",
    options: {
      A: "Underfitting",
      B: "Overfitting",
      C: "Regularization",
      D: "Gradient Descent"
    },
    answer: "B",
    category: "Artificial Intelligence"
  }
];

// Generate CSV file
export function generateCSV() {
  const csvRows = [
    ["Question Number", "Question Text", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Category"]
  ];

  SAMPLE_QUESTIONS.forEach((q) => {
    csvRows.push([
      `Q${q.id}`,
      `"${q.question.replace(/"/g, '""')}"`,
      `"${q.options.A.replace(/"/g, '""')}"`,
      `"${q.options.B.replace(/"/g, '""')}"`,
      `"${q.options.C.replace(/"/g, '""')}"`,
      `"${q.options.D.replace(/"/g, '""')}"`,
      q.answer,
      `"${q.category}"`
    ]);
  });

  const csvContent = csvRows.map(r => r.join(",")).join("\n");
  const csvPath = path.join(sampleDir, "sample-questions.csv");
  fs.writeFileSync(csvPath, csvContent, "utf-8");
  console.log(`[CSV] Generated sample CSV at: ${csvPath}`);
}

// Generate PDF file using pdf-lib adhering to the strict format:
// Q1. Question text
// A) option  B) option  C) option  D) option
// Answer: B
export async function generatePDF() {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 45;
  const contentWidth = pageWidth - (margin * 2);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Header Title
  page.drawText("MINDQUEST 2026 - MASTER QUESTION BANK", {
    x: margin,
    y: y,
    size: 13,
    font: fontBold,
    color: rgb(0.06, 0.36, 0.36) // Deep Teal
  });
  y -= 16;

  page.drawText("Official Competition Format Specification Sample | 30 Standardized Items", {
    x: margin,
    y: y,
    size: 9,
    font: fontRegular,
    color: rgb(0.35, 0.33, 0.30) // Muted ink
  });
  y -= 8;

  // Horizontal line
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: pageWidth - margin, y: y },
    thickness: 1,
    color: rgb(0.11, 0.11, 0.11)
  });
  y -= 22;

  for (let i = 0; i < SAMPLE_QUESTIONS.length; i++) {
    const q = SAMPLE_QUESTIONS[i];

    // Estimate height needed for this question block:
    // Header line, question text (1-2 lines), options (1-2 lines), answer line, spacer ~ 65-80 pt
    if (y < 90) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    // Question line: Q{id}. Text
    const qHeader = `Q${q.id}. ${q.question}`;
    // Simple wrap for question text if long
    if (qHeader.length > 85) {
      const splitIdx = qHeader.lastIndexOf(" ", 85);
      const line1 = qHeader.substring(0, splitIdx);
      const line2 = "     " + qHeader.substring(splitIdx + 1);

      page.drawText(line1, {
        x: margin,
        y: y,
        size: 10,
        font: fontBold,
        color: rgb(0.11, 0.11, 0.11)
      });
      y -= 13;
      page.drawText(line2, {
        x: margin,
        y: y,
        size: 10,
        font: fontBold,
        color: rgb(0.11, 0.11, 0.11)
      });
      y -= 14;
    } else {
      page.drawText(qHeader, {
        x: margin,
        y: y,
        size: 10,
        font: fontBold,
        color: rgb(0.11, 0.11, 0.11)
      });
      y -= 14;
    }

    // Option line in format: A) option  B) option  C) option  D) option
    // If long, split into A & B on line 1, C & D on line 2
    const optLine1 = `A) ${q.options.A}   B) ${q.options.B}`;
    const optLine2 = `C) ${q.options.C}   D) ${q.options.D}`;

    page.drawText(optLine1, {
      x: margin + 12,
      y: y,
      size: 9,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15)
    });
    y -= 12;

    page.drawText(optLine2, {
      x: margin + 12,
      y: y,
      size: 9,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15)
    });
    y -= 13;

    // Answer line: Answer: {key}
    page.drawText(`Answer: ${q.answer}`, {
      x: margin + 12,
      y: y,
      size: 9,
      font: fontMono,
      color: rgb(0.06, 0.36, 0.36) // Deep Teal
    });
    y -= 16;
  }

  const pdfBytes = await pdfDoc.save();
  const pdfPath = path.join(sampleDir, "sample-questions.pdf");
  fs.writeFileSync(pdfPath, pdfBytes);
  console.log(`[PDF] Generated sample PDF at: ${pdfPath}`);
}

async function main() {
  generateCSV();
  await generatePDF();
  console.log("Sample generation complete.");
}

main().catch(err => {
  console.error("Error generating samples:", err);
  process.exit(1);
});
