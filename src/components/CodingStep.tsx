import { useState, useEffect, useRef, useCallback } from "react";
import CameraMonitor from "./CameraMonitor";

const C = {
  bg: "#0d1117",
  surface: "#161b22",
  surface2: "#1c2128",
  border: "#30363d",
  accent: "#58a6ff",
  text: "#e6edf3",
  muted: "#8b949e",
  success: "#3fb950",
  warning: "#d29922",
  danger: "#f85149",
  purple: "#bc8cff",
  dim: "#3d3d45",
};

const LANGS: Record<
  string,
  { name: string; lang: string; version: string; filename: string }
> = {
  python: {
    name: "Python 3",
    lang: "python",
    version: "3.10.0",
    filename: "solution.py",
  },
  javascript: {
    name: "JavaScript",
    lang: "javascript",
    version: "18.15.0",
    filename: "solution.js",
  },
  java: {
    name: "Java",
    lang: "java",
    version: "15.0.2",
    filename: "Main.java",
  },
  cpp: {
    name: "C++",
    lang: "c++",
    version: "10.2.0",
    filename: "solution.cpp",
  },
  go: { name: "Go", lang: "go", version: "1.16.2", filename: "solution.go" },
};

async function executePiston(langKey: string, code: string, stdin = "") {
  const cfg = LANGS[langKey];
  const res = await fetch("/api/piston/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: cfg.lang,
      version: cfg.version,
      files: [{ name: cfg.filename, content: code }],
      stdin,
      args: [],
      compile_timeout: 15000,
      run_timeout: 8000,
    }),
  });
  if (!res.ok) throw new Error(`Piston HTTP ${res.status}`);
  const d = await res.json();
  return {
    stdout: d.run?.stdout || "",
    stderr: d.run?.stderr || "",
    compile: d.compile?.stderr || d.compile?.output || "",
    code: d.run?.code ?? 1,
  };
}

interface TestCase {
  input: string;
  expected: string;
  description: string;
}
interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  description: string;
  error?: string;
}

export interface CodingProblem {
  id: number;
  title: string;
  difficulty: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  testCases: TestCase[];
  constraints: string[];
  hint: string;
  starterCode: Record<string, string>;
  optimalSolution: Record<string, string>;
}

export interface CodingResult {
  problem: CodingProblem;
  code: string;
  language: string;
  testResults: TestResult[];
  passRate: number;
  score: number;
  aiAnalysis: string;
  optimalCode: string;
}

interface Props {
  questionData: any;
  resumeText: string;
  overallScore: number;
  onComplete: (results: CodingResult[]) => void;
}

const FALLBACK: CodingProblem[] = [
  {
    id: 1,
    title: "FizzBuzz",
    difficulty: "Easy",
    description:
      "Read N from stdin. Print numbers 1 to N. For multiples of 3 print 'Fizz', multiples of 5 print 'Buzz', both print 'FizzBuzz'. One number per line.",
    examples: [
      {
        input: "5",
        output: "1\n2\nFizz\n4\nBuzz",
        explanation: "3→Fizz, 5→Buzz",
      },
    ],
    testCases: [
      { input: "5", expected: "1\n2\nFizz\n4\nBuzz", description: "First 5" },
      { input: "3", expected: "1\n2\nFizz", description: "First 3" },
      {
        input: "15",
        expected:
          "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
        description: "Up to 15",
      },
    ],
    constraints: ["1 <= N <= 1000"],
    hint: "Check divisibility by 15 first, then 3, then 5.",
    starterCode: {
      python: `n = int(input())
for i in range(1, n + 1):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)`,
      javascript: `const n = parseInt(require('fs').readFileSync('/dev/stdin', 'utf8').trim());
for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) console.log('FizzBuzz');
    else if (i % 3 === 0) console.log('Fizz');
    else if (i % 5 === 0) console.log('Buzz');
    else console.log(i);
}`,
      java: `import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
        for (int i = 1; i <= n; i++) {
            if (i % 15 == 0) System.out.println("FizzBuzz");
            else if (i % 3 == 0) System.out.println("Fizz");
            else if (i % 5 == 0) System.out.println("Buzz");
            else System.out.println(i);
        }
    }
}`,
      cpp: `#include<iostream>
using namespace std;
int main(){
    int n; cin>>n;
    for(int i=1;i<=n;i++){
        if(i%15==0) cout<<"FizzBuzz\\n";
        else if(i%3==0) cout<<"Fizz\\n";
        else if(i%5==0) cout<<"Buzz\\n";
        else cout<<i<<"\\n";
    }
}`,
      go: `package main
import ("bufio"; "fmt"; "os"; "strconv"; "strings")
func main() {
    r := bufio.NewReader(os.Stdin)
    l, _ := r.ReadString('\\n')
    n, _ := strconv.Atoi(strings.TrimSpace(l))
    for i := 1; i <= n; i++ {
        if i%15 == 0 { fmt.Println("FizzBuzz") } else if i%3 == 0 { fmt.Println("Fizz") } else if i%5 == 0 { fmt.Println("Buzz") } else { fmt.Println(i) }
    }
}`,
    },
    optimalSolution: {
      python: `n = int(input())
for i in range(1, n + 1):
    print("FizzBuzz" if i%15==0 else "Fizz" if i%3==0 else "Buzz" if i%5==0 else str(i))`,
    },
  },
  {
    id: 2,
    title: "Reverse a String",
    difficulty: "Easy",
    description: "Read a string from stdin and print it reversed.",
    examples: [
      { input: "hello", output: "olleh" },
      { input: "world", output: "dlrow" },
    ],
    testCases: [
      { input: "hello", expected: "olleh", description: "Basic reverse" },
      { input: "world", expected: "dlrow", description: "Another word" },
      { input: "racecar", expected: "racecar", description: "Palindrome" },
    ],
    constraints: ["1 <= s.length <= 10000"],
    hint: "In Python use slicing [::-1]. In JS use split/reverse/join.",
    starterCode: {
      python: `s = input()\nprint(s[::-1])`,
      javascript: `const s = require('fs').readFileSync('/dev/stdin','utf8').trim();\nconsole.log(s.split('').reverse().join(''));`,
      java: `import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        String s = new Scanner(System.in).nextLine();\n        System.out.println(new StringBuilder(s).reverse());\n    }\n}`,
      cpp: `#include<iostream>\n#include<string>\n#include<algorithm>\nusing namespace std;\nint main(){\n    string s; getline(cin,s);\n    reverse(s.begin(),s.end());\n    cout<<s;\n}`,
      go: `package main\nimport("bufio";"fmt";"os";"strings")\nfunc main(){\n    r:=bufio.NewReader(os.Stdin)\n    s,_:=r.ReadString('\\n')\n    s=strings.TrimSpace(s)\n    runes:=[]rune(s)\n    for i,j:=0,len(runes)-1;i<j;i,j=i+1,j-1{runes[i],runes[j]=runes[j],runes[i]}\n    fmt.Println(string(runes))\n}`,
    },
    optimalSolution: {
      python: `print(input()[::-1])`,
      javascript: `console.log(require('fs').readFileSync('/dev/stdin','utf8').trim().split('').reverse().join(''));`,
    },
  },
];

export default function CodingStep({
  questionData,
  resumeText,
  overallScore,
  onComplete,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const [lang, setLang] = useState("python");
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [testResults, setTests] = useState<TestResult[]>([]);
  const [console_, setConsole] = useState("");
  const [compErr, setCompErr] = useState("");
  const [tab, setTab] = useState<"tests" | "output">("tests");

  const [analysing, setAnalysing] = useState(false);
  const [aiAnalysis, setAI] = useState("");
  const [optCode, setOptCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [allResults, setAllResults] = useState<CodingResult[]>([]);

  const [emotionLog, setEmotionLog] = useState<any[]>([]);
  const [camOpen, setCamOpen] = useState(true);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const timerRef = useRef<any>(null);

  const onEmotionCapture = useCallback(
    (d: any) => setEmotionLog((p) => [...p, d]),
    [],
  );

  // ── Fullscreen on mount ───────────────────────────────────────────────────
  useEffect(() => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen)
        (el as any).webkitRequestFullscreen();
    } catch {}
    return () => {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
      } catch {}
    };
  }, []);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setTimeLeft(25 * 60);
    timerRef.current = setInterval(
      () => setTimeLeft((t) => Math.max(0, t - 1)),
      1000,
    );
    return () => clearInterval(timerRef.current);
  }, [idx]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Generate problems ─────────────────────────────────────────────────────
  useEffect(() => {
    generate();
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const diff =
        overallScore >= 75 ? "Medium" : overallScore >= 50 ? "Easy" : "Easy";
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Generate 2 coding problems for a ${questionData.suggestedRole || "software developer"} candidate.
Resume skills: ${resumeText.slice(0, 500)}
Interview score: ${overallScore}% — difficulty: ${diff}

CRITICAL: The starterCode MUST read input from stdin and the solution must print result to stdout.
testCases.input must be exactly what stdin receives.
testCases.expected must be exactly what stdout should print (including newlines if needed).

Return ONLY this JSON:
{"problems":[{"id":1,"title":"Problem Name","difficulty":"Easy","description":"Full problem statement. Must read from stdin, print to stdout.","examples":[{"input":"example input","output":"example output","explanation":"why"}],"testCases":[{"input":"test input","expected":"exact expected output","description":"test description"},{"input":"test2","expected":"expected2","description":"desc2"},{"input":"test3","expected":"expected3","description":"desc3"}],"constraints":["constraint 1","constraint 2"],"hint":"helpful hint","starterCode":{"python":"complete working python code that reads stdin and prints answer","javascript":"complete working js code using fs.readFileSync","java":"complete working java with Scanner","cpp":"complete working c++ with cin","go":"complete working go code"},"optimalSolution":{"python":"optimal python solution","javascript":"optimal js solution"}}]}`,
            },
          ],
          system:
            "Coding problem generator. Return ONLY valid JSON. No markdown.",
          maxTokens: 2500,
        }),
      });
      const r = await res.json();
      if (!r.text) throw new Error("no response");
      const m = r.text
        .replace(/```json|```/g, "")
        .trim()
        .match(/\{[\s\S]*\}/);
      if (!m) throw new Error("parse fail");
      const data = JSON.parse(m[0]);
      if (!data.problems?.length) throw new Error("empty");
      setProblems(data.problems);
      setCode(data.problems[0].starterCode?.[lang] || "");
    } catch {
      setProblems(FALLBACK);
      setCode(FALLBACK[0].starterCode[lang] || "");
    } finally {
      setLoading(false);
    }
  };

  const changeLang = (l: string) => {
    setLang(l);
    setCode(problems[idx]?.starterCode?.[l] || "");
    setTests([]);
    setConsole("");
    setCompErr("");
    setAI("");
    setOptCode("");
  };

  // ── Run code freely ───────────────────────────────────────────────────────
  const runCode = async () => {
    if (!code.trim() || running) return;
    setRunning(true);
    setConsole("");
    setCompErr("");
    setTab("output");
    try {
      const { stdout, stderr, compile } = await executePiston(lang, code, "");
      if (compile) setCompErr(compile);
      setConsole(
        stdout + (stderr ? "\n[stderr]: " + stderr : "") || "(no output)",
      );
    } catch (e: any) {
      setCompErr(e.message);
    } finally {
      setRunning(false);
    }
  };

  // ── Run test cases ─────────────────────────────────────────────────────────
  const runTests = async () => {
    if (!code.trim() || running) return;
    setRunning(true);
    setTests([]);
    setCompErr("");
    setTab("tests");
    const p = problems[idx];
    const results: TestResult[] = [];
    for (const tc of p.testCases) {
      try {
        const {
          stdout,
          stderr,
          compile,
          code: exitCode,
        } = await executePiston(lang, code, tc.input);
        if (compile && exitCode !== 0) {
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.expected,
            actual: "",
            description: tc.description,
            error: compile.slice(0, 200),
          });
          continue;
        }
        const actual = stdout.trim();
        const expected = tc.expected.trim();
        const norm = (s: string) =>
          s
            .replace(/\r\n/g, "\n")
            .replace(/[ \t]+/g, " ")
            .trim();
        const passed = norm(actual) === norm(expected);
        results.push({
          passed,
          input: tc.input,
          expected,
          actual: stderr ? `[stderr] ${stderr.slice(0, 100)}` : actual,
          description: tc.description,
        });
      } catch (e: any) {
        results.push({
          passed: false,
          input: tc.input,
          expected: tc.expected,
          actual: "",
          description: tc.description,
          error: e.message,
        });
      }
    }
    setTests(results);
    setRunning(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (submitted || analysing) return;
    // Run tests first if not done
    let currentTests = testResults;
    if (currentTests.length === 0) {
      await runTests();
      // Wait for state update — read directly
      currentTests = [];
    }
    setAnalysing(true);
    try {
      const p = problems[idx];
      const passed = testResults.filter((r) => r.passed).length;
      const total = testResults.length || p.testCases.length;
      const pRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Review this coding interview submission.

Problem: "${p.title}"
${p.description}

Candidate's ${LANGS[lang]?.name || lang} code:
\`\`\`
${code}
\`\`\`

Test results: ${passed}/${total} passed (${pRate}%)

Provide structured feedback:
## What You Got Right
(specific praise)

## Issues Found  
(bugs, edge cases, inefficiencies)

## Optimal Solution
\`\`\`${lang === "cpp" ? "cpp" : lang}
(working optimal code here)
\`\`\`

## Complexity
- Time: O(?)
- Space: O(?)

## Score: X/10
(brief reasoning)`,
            },
          ],
          system:
            "Senior engineer reviewing interview code. Be specific and educational.",
          maxTokens: 1200,
        }),
      });
      const r = await res.json();
      const txt = r.text || "Analysis unavailable.";
      setAI(txt);

      // Extract code block from AI
      const codeMatch = txt.match(/```[\w]*\n([\s\S]*?)```/);
      const optimal = codeMatch
        ? codeMatch[1]
        : p.optimalSolution?.[lang] || p.optimalSolution?.python || "";
      setOptCode(optimal);

      const score = Math.min(
        10,
        Math.max(1, Math.round((pRate / 100) * 7 + 2)),
      );
      const result: CodingResult = {
        problem: p,
        code,
        language: lang,
        testResults,
        passRate: pRate,
        aiAnalysis: txt,
        optimalCode: optimal,
        score,
      };
      const newAll = [...allResults, result];
      setAllResults(newAll);
      setSubmitted(true);

      if (idx >= problems.length - 1) {
        clearInterval(timerRef.current);
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
        } catch {}
        setTimeout(() => onComplete(newAll), 1500);
      }
    } catch (e: any) {
      setCompErr("AI error: " + e.message);
    } finally {
      setAnalysing(false);
    }
  };

  const goNext = () => {
    const next = idx + 1;
    setIdx(next);
    setCode(problems[next]?.starterCode?.[lang] || "");
    setTests([]);
    setConsole("");
    setCompErr("");
    setAI("");
    setOptCode("");
    setSubmitted(false);
  };

  if (loading)
    return (
      <div
        style={{
          height: "100vh",
          background: C.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: C.text,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 20 }}>💻</div>
        <h2 style={{ fontFamily: "Georgia,serif", marginBottom: 10 }}>
          Generating coding problems…
        </h2>
        <p style={{ color: C.muted }}>
          Tailoring to your resume & score ({overallScore}%)
        </p>
      </div>
    );

  const p = problems[idx];
  const passedN = testResults.filter((r) => r.passed).length;
  const pRate =
    testResults.length > 0
      ? Math.round((passedN / testResults.length) * 100)
      : null;
  const timerCol =
    timeLeft < 300 ? C.danger : timeLeft < 600 ? C.warning : C.muted;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        background: C.bg,
        color: C.text,
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        display: "flex",
        flexDirection: "column",
        zIndex: 9999,
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        textarea { outline: none; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        .lbtn { padding: 5px 11px; border-radius: 5px; cursor: pointer; font-size: 11px; font-weight: 600; border: 1px solid; font-family: sans-serif; transition: all 0.15s; }
        .tbtn { padding: 7px 14px; background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 12px; font-family: sans-serif; transition: all 0.15s; }
      `}</style>

      {/* TOP BAR */}
      <div
        style={{
          height: 46,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          background: C.surface,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "Georgia,serif",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            💻 Coding Round
          </span>
          <span
            style={{
              fontSize: 11,
              color: C.purple,
              border: `1px solid ${C.purple}40`,
              borderRadius: 4,
              padding: "2px 9px",
              fontFamily: "sans-serif",
            }}
          >
            Problem {idx + 1}/{problems.length}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 4,
              padding: "2px 9px",
              border: "1px solid",
              fontFamily: "sans-serif",
              color:
                p.difficulty === "Easy"
                  ? C.success
                  : p.difficulty === "Medium"
                    ? C.warning
                    : C.danger,
              borderColor:
                p.difficulty === "Easy"
                  ? C.success + "50"
                  : p.difficulty === "Medium"
                    ? C.warning + "50"
                    : C.danger + "50",
            }}
          >
            {p.difficulty}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {Object.entries(LANGS).map(([k, v]) => (
            <button
              key={k}
              className="lbtn"
              onClick={() => changeLang(k)}
              style={{
                background: lang === k ? `${C.accent}18` : "transparent",
                borderColor: lang === k ? C.accent : C.border,
                color: lang === k ? C.accent : C.muted,
              }}
            >
              {v.name}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: C.border }} />
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 15,
              fontWeight: 700,
              color: timerCol,
              minWidth: 58,
            }}
          >
            ⏱ {fmt(timeLeft)}
          </div>
          <button
            onClick={() => setCamOpen((o) => !o)}
            style={{
              padding: "4px 10px",
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.muted,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "sans-serif",
            }}
          >
            {camOpen ? "Hide Cam" : "Cam"}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT — Problem */}
        <div
          style={{
            width: 370,
            borderRight: `1px solid ${C.border}`,
            overflow: "auto",
            flexShrink: 0,
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ padding: 18 }}>
            <h2
              style={{
                fontFamily: "Georgia,serif",
                fontSize: 17,
                marginBottom: 10,
                color: C.text,
              }}
            >
              {p.title}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: C.muted,
                lineHeight: 1.7,
                marginBottom: 14,
              }}
            >
              {p.description}
            </p>

            {p.examples?.map((ex, i) => (
              <div
                key={i}
                style={{
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    fontWeight: 600,
                    marginBottom: 5,
                    letterSpacing: "0.5px",
                  }}
                >
                  EXAMPLE {i + 1}
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 11 }}>
                  <div>
                    <span style={{ color: C.dim }}>Input: </span>
                    <span style={{ color: C.text }}>{ex.input}</span>
                  </div>
                  <div>
                    <span style={{ color: C.dim }}>Output: </span>
                    <span style={{ color: C.success }}>{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div style={{ color: C.muted, marginTop: 3, fontSize: 10 }}>
                      💡 {ex.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 10,
                  color: C.muted,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  marginBottom: 5,
                }}
              >
                CONSTRAINTS
              </div>
              {p.constraints?.map((c, i) => (
                <div
                  key={i}
                  style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}
                >
                  • {c}
                </div>
              ))}
            </div>

            <div
              style={{
                background: `${C.warning}10`,
                border: `1px solid ${C.warning}30`,
                borderRadius: 7,
                padding: "9px 11px",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: C.warning,
                  fontWeight: 600,
                  marginBottom: 3,
                }}
              >
                💡 HINT
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                {p.hint}
              </div>
            </div>

            {aiAnalysis && (
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  padding: 13,
                  marginBottom: 12,
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: C.purple,
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    marginBottom: 8,
                  }}
                >
                  ✦ AI CODE REVIEW
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {aiAnalysis}
                </div>
              </div>
            )}

            {optCode && (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: C.success,
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    marginBottom: 6,
                  }}
                >
                  ✓ OPTIMAL SOLUTION
                </div>
                <div
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.success}30`,
                    borderRadius: 7,
                    padding: 10,
                  }}
                >
                  <pre
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: C.text,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                    }}
                  >
                    {optCode}
                  </pre>
                </div>
              </div>
            )}

            {submitted && (
              <div style={{ marginTop: 14 }}>
                {idx < problems.length - 1 ? (
                  <button
                    onClick={goNext}
                    style={{
                      width: "100%",
                      padding: "11px",
                      background: C.accent,
                      color: C.bg,
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    Next Problem →
                  </button>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        color: C.success,
                        fontSize: 13,
                        marginBottom: 10,
                      }}
                    >
                      🎉 All done! Loading report…
                    </div>
                    <button
                      onClick={() => {
                        try {
                          if (document.fullscreenElement)
                            document.exitFullscreen();
                        } catch {}
                        onComplete(allResults);
                      }}
                      style={{
                        width: "100%",
                        padding: "11px",
                        background: C.success,
                        color: C.bg,
                        border: "none",
                        borderRadius: 7,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      View Report →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CENTER — Editor */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Editor topbar */}
          <div
            style={{
              height: 34,
              background: C.surface2,
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: 5 }}>
              {["#f85149", "#f0883e", "#3fb950"].map((c) => (
                <div
                  key={c}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: c,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 10, color: C.muted }}>
              {LANGS[lang]?.filename}
            </span>
            <button
              onClick={() => setCode(problems[idx]?.starterCode?.[lang] || "")}
              style={{
                fontSize: 10,
                color: C.muted,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "sans-serif",
              }}
            >
              Reset
            </button>
          </div>

          {/* Code area */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Line numbers */}
            <div
              style={{
                background: C.surface,
                borderRight: `1px solid ${C.border}`,
                padding: "10px 8px 10px 6px",
                textAlign: "right",
                minWidth: 42,
                flexShrink: 0,
                overflowY: "hidden",
              }}
            >
              {code.split("\n").map((_, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    color: C.dim,
                    lineHeight: "1.6em",
                    height: "1.6em",
                    userSelect: "none",
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            {/* Textarea */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const s = e.currentTarget.selectionStart;
                  const n =
                    code.substring(0, s) +
                    "    " +
                    code.substring(e.currentTarget.selectionEnd);
                  setCode(n);
                  setTimeout(() => {
                    e.currentTarget.selectionStart =
                      e.currentTarget.selectionEnd = s + 4;
                  }, 0);
                }
              }}
              spellCheck={false}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: C.bg,
                color: C.text,
                border: "none",
                resize: "none",
                fontSize: 13,
                lineHeight: "1.6em",
                fontFamily: "inherit",
                overflowY: "auto",
              }}
            />
          </div>

          {/* Action bar */}
          <div
            style={{
              height: 46,
              borderTop: `1px solid ${C.border}`,
              background: C.surface2,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              flexShrink: 0,
            }}
          >
            <button
              onClick={runCode}
              disabled={running || submitted}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                background: running ? C.border : `${C.warning}16`,
                border: `1px solid ${C.warning}40`,
                color: C.warning,
                borderRadius: 6,
                cursor: running || submitted ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 12,
                fontFamily: "sans-serif",
              }}
            >
              {running ? "⏳" : "▶"} Run
            </button>
            <button
              onClick={runTests}
              disabled={running || submitted}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                background: `${C.accent}10`,
                border: `1px solid ${C.accent}40`,
                color: C.accent,
                borderRadius: 6,
                cursor: running || submitted ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 12,
                fontFamily: "sans-serif",
              }}
            >
              {running ? "⏳" : "🧪"} Test
            </button>
            <button
              onClick={submit}
              disabled={running || analysing || submitted}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 20px",
                background: submitted ? C.border : "#238636",
                border: "none",
                color: submitted ? C.muted : "#fff",
                borderRadius: 6,
                cursor:
                  running || analysing || submitted ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 12,
                fontFamily: "sans-serif",
              }}
            >
              {analysing
                ? "⏳ Analysing…"
                : submitted
                  ? "✓ Submitted"
                  : "Submit"}
            </button>
            {pRate !== null && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  color:
                    pRate === 100
                      ? C.success
                      : pRate >= 50
                        ? C.warning
                        : C.danger,
                  fontWeight: 700,
                  fontFamily: "sans-serif",
                }}
              >
                {passedN}/{testResults.length} tests ({pRate}%)
              </span>
            )}
          </div>

          {/* Output panel */}
          <div
            style={{
              height: 190,
              borderTop: `1px solid ${C.border}`,
              background: C.bg,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                borderBottom: `1px solid ${C.border}`,
                background: C.surface2,
                flexShrink: 0,
              }}
            >
              {(["tests", "output"] as const).map((t) => (
                <button
                  key={t}
                  className="tbtn"
                  onClick={() => setTab(t)}
                  style={{
                    color: tab === t ? C.text : C.muted,
                    borderBottom: `2px solid ${tab === t ? C.accent : "transparent"}`,
                    fontWeight: tab === t ? 600 : 400,
                  }}
                >
                  {t === "tests" ? "🧪 Test Cases" : "📟 Console"}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "8px 12px" }}>
              {tab === "tests" && (
                <>
                  {compErr && (
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: C.danger,
                        whiteSpace: "pre-wrap",
                        margin: "0 0 8px",
                      }}
                    >
                      {compErr}
                    </pre>
                  )}
                  {!running && testResults.length === 0 && (
                    <div
                      style={{
                        color: C.dim,
                        fontSize: 12,
                        fontFamily: "sans-serif",
                      }}
                    >
                      Click "Test" to run all test cases against your code.
                    </div>
                  )}
                  {running && (
                    <div
                      style={{
                        color: C.muted,
                        fontSize: 12,
                        fontFamily: "sans-serif",
                      }}
                    >
                      ⏳ Running test cases via Piston…
                    </div>
                  )}
                  {testResults.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "7px 9px",
                        borderRadius: 6,
                        marginBottom: 5,
                        background: r.passed
                          ? "rgba(63,185,80,0.07)"
                          : "rgba(248,81,73,0.07)",
                        border: `1px solid ${r.passed ? C.success : C.danger}25`,
                      }}
                    >
                      <span style={{ fontSize: 12, flexShrink: 0 }}>
                        {r.passed ? "✅" : "❌"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: r.passed ? C.success : C.danger,
                            marginBottom: 2,
                            fontFamily: "sans-serif",
                          }}
                        >
                          {r.description}
                        </div>
                        {r.error ? (
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: 10,
                              color: C.danger,
                            }}
                          >
                            {r.error}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: 10,
                              color: C.muted,
                            }}
                          >
                            <span style={{ color: C.dim }}>Expected: </span>
                            <span style={{ color: C.text }}>
                              {r.expected.slice(0, 80)}
                            </span>
                            {!r.passed && (
                              <span>
                                {" "}
                                | <span style={{ color: C.dim }}>Got: </span>
                                <span style={{ color: C.danger }}>
                                  {r.actual.slice(0, 80) || "(no output)"}
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {tab === "output" && (
                <>
                  {compErr && (
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: C.danger,
                        whiteSpace: "pre-wrap",
                        marginBottom: 6,
                      }}
                    >
                      {compErr}
                    </pre>
                  )}
                  <pre
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: C.text,
                      whiteSpace: "pre-wrap",
                      margin: 0,
                    }}
                  >
                    {console_ || (
                      <span style={{ color: C.dim }}>
                        Click "Run" to execute code with no stdin…
                      </span>
                    )}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Camera */}
        {camOpen && (
          <div
            style={{
              width: 216,
              borderLeft: `1px solid ${C.border}`,
              padding: 10,
              background: C.surface,
              overflow: "auto",
              flexShrink: 0,
            }}
          >
            <CameraMonitor
              isActive={true}
              questionIndex={idx + 100}
              onEmotionCapture={onEmotionCapture}
            />
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  fontSize: 10,
                  color: C.muted,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  marginBottom: 7,
                  fontFamily: "sans-serif",
                }}
              >
                TIPS
              </div>
              {[
                "Read the problem twice",
                "Start brute force",
                "Walk through examples",
                "Handle edge cases",
                "Optimise after it works",
              ].map((t, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    color: C.dim,
                    marginBottom: 4,
                    fontFamily: "sans-serif",
                  }}
                >
                  • {t}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
