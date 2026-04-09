// ─────────────────────────────────────────────────────────────────────────────
// Mock Data — CELPIP WebTool
// All pages use this data when NEXT_PUBLIC_USE_MOCK=true (dev) or when the
// API is unavailable. Keeps every page 100% browsable without a backend.
// ─────────────────────────────────────────────────────────────────────────────

import type { AppUser, SpeakingTask, WritingTask, Attempt, CalibrationSample } from "./types";

// ── Mock User ─────────────────────────────────────────────────────────────────

export const MOCK_USER: AppUser = {
  id:              "mock-user-1",
  clerk_id:        "clerk_mock_001",
  full_name:       "Jay Kareliya",
  email:           "jay@example.com",
  plan:            "starter",
  role:            "user",
  streak_days:     5,
  last_active_date: "2026-03-28T00:00:00Z",
  target_band:     9,
};

// ── Mock Speaking Tasks ────────────────────────────────────────────────────────

export const MOCK_SPEAKING_TASKS: SpeakingTask[] = [
  {
    id:                   "practice",
    task_number:          0,
    title:                "Practice Task",
    prep_time_seconds:    30,
    response_time_seconds: 60,
    difficulty:           "easy",
    prompt_text:          "Describe what you usually do on a typical morning.",
    vocabulary_tips:      ["typically", "usually", "first of all", "after that", "finally"],
    connector_phrases:    ["To begin with", "Following that", "As a result", "In addition"],
    template_hint:        "Start by saying: 'On a typical morning, I usually...'",
    has_parts:            false,
  },
  {
    id:                   "task-1",
    task_number:          1,
    title:                "Giving Advice",
    prep_time_seconds:    30,
    response_time_seconds: 90,
    difficulty:           "medium",
    prompt_text:
      "Your friend recently moved to Canada and is struggling to make new friends. " +
      "They feel isolated and are not sure how to connect with people at work or in their neighbourhood. " +
      "What advice would you give them?",
    vocabulary_tips:      ["I would suggest", "you might want to", "one effective approach is", "it's worth considering"],
    connector_phrases:    ["First and foremost", "In addition to that", "On top of that", "To wrap up"],
    template_hint:        "1. Acknowledge the situation  →  2. Give 2–3 clear pieces of advice  →  3. Encourage them",
    has_parts:            false,
  },
  {
    id:                   "task-2",
    task_number:          2,
    title:                "Talking about a Personal Experience",
    prep_time_seconds:    30,
    response_time_seconds: 60,
    difficulty:           "easy",
    prompt_text:
      "Tell me about a time when you had to learn something new very quickly. " +
      "What was the situation? What did you do? How did it turn out?",
    vocabulary_tips:      ["at the time", "I recall", "unexpectedly", "as a result", "looking back"],
    connector_phrases:    ["Initially", "As time went on", "Eventually", "Reflecting on it"],
    template_hint:        "Set the scene  →  Describe actions  →  Explain outcome  →  Reflect",
    has_parts:            false,
  },
  {
    id:                   "task-3",
    task_number:          3,
    title:                "Describing a Scene",
    prep_time_seconds:    30,
    response_time_seconds: 60,
    difficulty:           "medium",
    prompt_text:
      "Look at the image. Describe what you see in as much detail as possible. " +
      "Who is there? What is happening? What might happen next?",
    vocabulary_tips:      ["In the foreground", "In the background", "It appears that", "presumably", "adjacent to"],
    connector_phrases:    ["On the left side", "Towards the right", "In the centre", "Meanwhile"],
    template_hint:        "Overall scene  →  Foreground detail  →  Background detail  →  What might happen next",
    has_parts:            false,
    // Tasks 3 & 4 share the same scene image (per CELPIP exam format)
    context_image_url:    "https://picsum.photos/seed/celpip-scene/800/500",
  },
  {
    id:                   "task-4",
    task_number:          4,
    title:                "Making Predictions",
    prep_time_seconds:    30,
    response_time_seconds: 60,
    difficulty:           "medium",
    prompt_text:
      "Look at the image. Based on what you see, make predictions about what might happen " +
      "in the short-term and long-term future. Support your predictions with details from the image.",
    vocabulary_tips:      ["is likely to", "there's a good chance that", "I predict", "It's probable that", "might well"],
    connector_phrases:    ["In the first image", "Moving to the second picture", "Finally, in the last image"],
    template_hint:        "Describe each image  →  Make a prediction with reasoning  →  Connect all three",
    has_parts:            false,
    // Tasks 3 & 4 share the same scene image (per CELPIP exam format)
    context_image_url:    "https://picsum.photos/seed/celpip-scene/800/500",
  },
  {
    id:                   "task-5",
    task_number:          5,
    title:                "Comparing and Persuading",
    prep_time_seconds:    60,
    response_time_seconds: 60,
    difficulty:           "hard",
    prompt_text:
      "Part 1: Look at the two images. Compare the situations shown and say which you prefer and why.\n\n" +
      "Part 2: Now try to convince your friend to choose the option you did not choose in Part 1.",
    vocabulary_tips:      ["In contrast", "On the other hand", "A key difference is", "While both", "I would argue"],
    connector_phrases:    ["Compared to", "Unlike the first option", "That said", "From another perspective"],
    template_hint:        "Part 1: Compare both  →  State preference + 2 reasons — Part 2: Persuade opposite",
    has_parts:            true,
    part_count:           2,
  },
  {
    id:                   "task-6",
    task_number:          6,
    title:                "Dealing with a Difficult Situation",
    prep_time_seconds:    30,
    response_time_seconds: 60,
    difficulty:           "hard",
    prompt_text:
      "You are leaving a voicemail for your landlord. You discovered a water leak in your apartment. " +
      "Explain the problem clearly, describe where the leak is, and ask the landlord to take urgent action.",
    vocabulary_tips:      ["I'm calling to inform you", "The issue is located", "This requires urgent attention", "Please contact me"],
    connector_phrases:    ["First of all", "Furthermore", "As a result", "I would appreciate it if"],
    template_hint:        "Introduce yourself  →  Describe the problem  →  Location/severity  →  Requested action",
    has_parts:            false,
  },
  {
    id:                   "task-7",
    task_number:          7,
    title:                "Expressing Opinions",
    prep_time_seconds:    30,
    response_time_seconds: 90,
    difficulty:           "hard",
    prompt_text:
      "Some people believe that university education should be free for all citizens. " +
      "Others think students should pay tuition fees. What is your opinion? Why?",
    vocabulary_tips:      ["I firmly believe", "From my perspective", "There is strong evidence to suggest", "Critics might argue"],
    connector_phrases:    ["To begin with", "In addition", "However", "Despite this", "Ultimately"],
    template_hint:        "State opinion  →  Reason 1 + example  →  Reason 2 + example  →  Address counterargument  →  Restate opinion",
    has_parts:            false,
  },
  {
    id:                   "task-8",
    task_number:          8,
    title:                "Describing an Unusual Situation",
    prep_time_seconds:    30,
    response_time_seconds: 60,
    difficulty:           "hard",
    prompt_text:
      "Look at the image. Something unusual is happening. " +
      "Describe the scene, explain what you think led to this situation, and predict what might happen next.",
    vocabulary_tips:      ["Evidently", "It would appear that", "This suggests", "Remarkably", "Unexpectedly"],
    connector_phrases:    ["What strikes me is", "This could be explained by", "As a consequence", "What might follow is"],
    template_hint:        "Describe the scene  →  Theorise a cause  →  Predict outcome  →  Personal reaction",
    has_parts:            false,
    // Task 8 has its own unique image per prompt (different from Tasks 3 & 4)
    context_image_url:    "https://picsum.photos/seed/celpip-unusual/800/500",
  },
];

// ── Mock Writing Tasks ────────────────────────────────────────────────────────

export const MOCK_WRITING_TASKS: WritingTask[] = [
  {
    id:                  "writing-task-1",
    task_number:         1,
    title:               "Writing an Email",
    task_type:           "Email Format",
    time_limit_seconds:  27 * 60,
    min_words:           150,
    max_words:           200,
    prompt_text:
      "You recently bought a laptop from an electronics store, but it stopped working after two weeks. " +
      "Write an email to the store manager. In your email:\n" +
      "• Describe the problem with the laptop\n" +
      "• Explain how this has affected you\n" +
      "• Ask for a full refund or replacement",
    idea_hints: [
      "Mention the purchase date and model",
      "Describe the specific malfunction (won't turn on, screen issues, etc.)",
      "Explain impact: work disrupted, important files at risk",
      "Request a specific resolution: replacement or refund",
    ],
    intro_template:        "I am writing regarding a laptop I purchased from your store on [date]. Unfortunately, I have encountered a significant issue that requires your prompt attention.",
    conclusion_template:   "I would appreciate a prompt response to this matter. I look forward to hearing from you at your earliest convenience.",
  },
  {
    id:                  "writing-task-2",
    task_number:         2,
    title:               "Writing an Opinion Essay",
    task_type:           "Opinion Essay",
    time_limit_seconds:  26 * 60,
    min_words:           150,
    max_words:           200,
    prompt_text:
      "Some people think that working from home is better than working in an office. " +
      "Others disagree. Do you think working from home is a positive or negative development? " +
      "Use specific reasons and examples to support your opinion.",
    idea_hints: [
      "Flexibility and work-life balance",
      "Productivity without office distractions",
      "Challenges: isolation, lack of collaboration",
      "Impact on company culture",
    ],
    intro_template:        "The debate around remote work has intensified in recent years. While some argue that working from home offers unmatched flexibility, others contend that it undermines collaboration and productivity. In my view, [your position].",
    conclusion_template:   "In conclusion, while [counterargument has merit], I believe that [restate position] is the stronger approach because [brief reason]. Ultimately, [final thought].",
  },
];

// ── Mock Attempts ─────────────────────────────────────────────────────────────

export const MOCK_RECENT_ATTEMPTS: Attempt[] = [
  {
    id:             "att-001",
    user_id:        "mock-user-1",
    skill:          "speaking",
    task_id:        "task-1",
    task_title:     "Task 1 — Giving Advice",
    status:         "complete",
    created_at:     "2026-03-27T14:30:00Z",
    completed_at:   "2026-03-27T14:32:10Z",
    estimated_band: 7.5,
    feedback: {
      overall_band:  7.5,
      summary:       "Good coherent response with strong vocabulary. Improve intonation variety and reduce filler words.",
      strengths:     ["Clear structure", "Good vocabulary range", "Relevant examples"],
      improvements:  ["Reduce 'um' and 'uh'", "Vary sentence length more"],
      dimensions: [
        { label: "Vocabulary Range",   score: 8   },
        { label: "Coherence & Flow",    score: 7.5 },
        { label: "Grammar Accuracy",    score: 7   },
        { label: "Pronunciation",       score: 7.5 },
      ],
    },
  },
  {
    id:             "att-002",
    user_id:        "mock-user-1",
    skill:          "writing",
    task_id:        "writing-task-1",
    task_title:     "Task 1 — Writing an Email",
    status:         "processing",
    created_at:     "2026-03-28T09:00:00Z",
    estimated_band: null,
  },
  {
    id:             "att-003",
    user_id:        "mock-user-1",
    skill:          "speaking",
    task_id:        "task-3",
    task_title:     "Task 3 — Describing a Scene",
    status:         "complete",
    created_at:     "2026-03-25T11:00:00Z",
    completed_at:   "2026-03-25T11:03:30Z",
    estimated_band: 6,
  },
];

// ── Mock Calibration Samples ──────────────────────────────────────────────────

export const MOCK_CALIBRATION_SAMPLES: CalibrationSample[] = [
  {
    id:          "cal-001",
    skill:       "speaking",
    task_number: 1,
    band_level:  9,
    sample_text: "I would strongly suggest that your friend join local community groups or attend workplace social events. Making friends in a new country can be challenging, but consistency is key. I would also recommend reaching out to neighbours...",
    source:      "official",
    is_active:   true,
    created_at:  "2026-03-01T00:00:00Z",
  },
  {
    id:          "cal-002",
    skill:       "writing",
    task_number: 2,
    band_level:  7,
    sample_text: "In my opinion, working from home has both advantages and disadvantages. While it offers flexibility and eliminates commuting time, it can also lead to feelings of isolation...",
    source:      "official",
    is_active:   true,
    created_at:  "2026-03-10T00:00:00Z",
  },
];
