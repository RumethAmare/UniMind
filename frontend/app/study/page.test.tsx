import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InteractiveMcqs } from "@/features/study/interactive-mcqs";

const mcqs = [
  {
    question: "Which protocol provides reliable transport?",
    options: ["UDP", "TCP", "IP", "ICMP"],
    correct_answer: "TCP",
    explanation: "TCP provides reliable, ordered delivery."
  },
  {
    question: "Which concept prevents two processes from entering a critical section together?",
    options: ["Deadlock", "Mutual exclusion", "Paging", "Thrashing"],
    correct_answer: "Mutual exclusion",
    explanation: "Mutual exclusion allows only one process into the critical section at a time."
  }
];

describe("InteractiveMcqs", () => {
  it("shows correct feedback when the user selects the right option", async () => {
    const user = userEvent.setup();
    render(<InteractiveMcqs mcqs={mcqs} />);

    await user.click(screen.getByRole("button", { name: /b tcp/i }));

    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.getByText("TCP provides reliable, ordered delivery.")).toBeInTheDocument();
  });

  it("shows the correct answer when the user selects a wrong option", async () => {
    const user = userEvent.setup();
    render(<InteractiveMcqs mcqs={mcqs} />);

    await user.click(screen.getByRole("button", { name: /a udp/i }));

    expect(screen.getByText("Incorrect. Correct answer: TCP")).toBeInTheDocument();
    expect(screen.getByText("TCP provides reliable, ordered delivery.")).toBeInTheDocument();
  });

  it("clears selected answers with reset", async () => {
    const user = userEvent.setup();
    render(<InteractiveMcqs mcqs={mcqs} />);

    await user.click(screen.getByRole("button", { name: /b tcp/i }));
    expect(screen.getByText("1 of 2 answered")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset answers/i }));

    expect(screen.getByText("0 of 2 answered")).toBeInTheDocument();
    expect(screen.queryByText("Correct")).not.toBeInTheDocument();
  });
});
