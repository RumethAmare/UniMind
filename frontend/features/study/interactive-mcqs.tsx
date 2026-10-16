"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { Button } from "@/components/ui";

export type McqQuestion = {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
};

export function InteractiveMcqs({ mcqs }: { mcqs: McqQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const answeredCount = Object.keys(answers).length;
  const correctCount = mcqs.filter((mcq, questionIndex) => answers[questionIndex] === mcq.correct_answer).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          {correctCount} correct · {answeredCount} of {mcqs.length} answered
        </p>
        <Button variant="secondary" onClick={() => setAnswers({})} disabled={answeredCount === 0}>
          Reset answers
        </Button>
      </div>

      {mcqs.map((mcq, questionIndex) => {
        const selected = answers[questionIndex];
        const isAnswered = selected !== undefined;
        const isCorrect = selected === mcq.correct_answer;

        return (
          <div key={`${mcq.question}-${questionIndex}`} className="rounded-md border border-line p-4">
            <p className="text-xs font-semibold uppercase text-neutral-500">Question {questionIndex + 1}</p>
            <h3 className="mt-1 text-base font-semibold">{mcq.question}</h3>

            <div className="mt-4 space-y-2">
              {mcq.options.map((option, optionIndex) => {
                const isSelected = selected === option;
                const isAnswer = option === mcq.correct_answer;
                return (
                  <button
                    key={`${option}-${optionIndex}`}
                    type="button"
                    onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: option }))}
                    disabled={isAnswered}
                    className={clsx(
                      "flex min-h-11 w-full items-center rounded-md border border-line px-3 py-2 text-left text-sm transition",
                      "hover:border-neutral-500 hover:bg-neutral-50 disabled:cursor-default disabled:hover:border-line disabled:hover:bg-transparent dark:hover:border-neutral-500 dark:hover:bg-neutral-900",
                      isAnswered && isAnswer && "border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-100",
                      isAnswered && isSelected && !isAnswer && "border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-100"
                    )}
                    aria-pressed={isSelected}
                  >
                    <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {isAnswered ? (
              <div
                className={clsx(
                  "mt-4 rounded-md border p-3 text-sm",
                  isCorrect
                    ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-100"
                    : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
                )}
              >
                <p className="font-semibold">
                  {isCorrect ? "Correct" : `Incorrect. Correct answer: ${mcq.correct_answer}`}
                </p>
                <p className="mt-1">{mcq.explanation}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
