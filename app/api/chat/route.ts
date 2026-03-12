import { NextResponse } from "next/server";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatApiResponse = {
  messages: string[];
  showWaitlist: boolean;
};

const QUESTION_FLOW = [
  {
    key: "age",
    question: "How old is your child turning?",
    fallback: "7",
  },
  {
    key: "partyType",
    question:
      "What kind of party are you thinking about? Indoor play place, trampoline park, backyard, or something else?",
    fallback: "indoor play place",
  },
  {
    key: "guestCount",
    question: "About how many kids are attending?",
    fallback: "15",
  },
  {
    key: "location",
    question: "What city or neighborhood should I plan around?",
    fallback: "your area",
  },
  {
    key: "budget",
    question: "What budget range do you want to stay within?",
    fallback: "$700-$900",
  },
  {
    key: "food",
    question:
      "Do you want food or catering included? Pizza, snacks, full meal, or no preference?",
    fallback: "pizza and kid-friendly snacks",
  },
  {
    key: "entertainment",
    question:
      "Do you want entertainment like a magician, bounce house, face painter, or no preference?",
    fallback: "a simple activity setup with no extra entertainment yet",
  },
  {
    key: "cake",
    question: "Any cake preference? Flavor, style, or bakery budget?",
    fallback: "a themed birthday cake",
  },
  {
    key: "theme",
    question:
      "Do you have a theme in mind? Princess, soccer, dinos, superheroes, or no preference?",
    fallback: "a fun colorful birthday theme",
  },
  {
    key: "decorations",
    question:
      "Do you want simple decorations or a fuller setup with balloons, signage, and table decor?",
    fallback: "a simple balloon and table decor setup",
  },
  {
    key: "anythingElse",
    question:
      "Anything else I should know, like allergies, accessibility needs, timing, or special requests?",
    fallback: "no additional requests",
  },
] as const;

const PLAN_INTRO_MESSAGE =
  "Great, I have enough info for now, and I'll ask follow-up questions if I need anything else. In the next few days, I'll call venues, caterers, and entertainment options to get quotes, then create a mood board with decoration and food ideas.";

type PlannerFieldKey = (typeof QUESTION_FLOW)[number]["key"];

type PlannerDetails = Record<PlannerFieldKey, string> & {
  userAnswers: string[];
};

function extractDetails(messages: ChatMessage[]): PlannerDetails {
  const userAnswers = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);

  const details = QUESTION_FLOW.reduce(
    (accumulator, field, index) => {
      accumulator[field.key] = userAnswers[index] ?? field.fallback;
      return accumulator;
    },
    {} as Record<PlannerFieldKey, string>
  );

  return { ...details, userAnswers };
}

function buildQuestionResponse(userAnswers: string[]): ChatApiResponse {
  return {
    messages: [QUESTION_FLOW[userAnswers.length].question],
    showWaitlist: false,
  };
}

function buildReadyResponse(): ChatApiResponse {
  return {
    messages: [PLAN_INTRO_MESSAGE],
    showWaitlist: true,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(
          (message): message is ChatMessage =>
            Boolean(message) &&
            (message.role === "assistant" || message.role === "user") &&
            typeof message.content === "string"
        )
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required." },
        { status: 400 }
      );
    }

    const { userAnswers } = extractDetails(messages);

    if (userAnswers.length < QUESTION_FLOW.length) {
      return NextResponse.json(buildQuestionResponse(userAnswers));
    }

    return NextResponse.json(buildReadyResponse());
  } catch (error) {
    console.error("Chat API error", error);

    return NextResponse.json(
      {
        error:
          "I couldn't generate the next message right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
