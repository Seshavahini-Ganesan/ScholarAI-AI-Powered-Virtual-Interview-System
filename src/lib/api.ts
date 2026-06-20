const API_BASE = '/api';

async function getAuthToken() {
  const clerk = (window as any).Clerk;
  if (!clerk) throw new Error('Clerk not loaded');
  const token = await clerk.session?.getToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

export async function parseResume(file: File) {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await fetch(`${API_BASE}/resume/parse`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to parse resume' }));
    throw new Error(error.error || 'Failed to parse resume');
  }

  return await res.json();
}

export async function generateQuestions(resumeText: string, jobRole = '', count = 7) {
  const token = await getAuthToken();

  const res = await fetch(`${API_BASE}/interview/generate-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ resumeText, jobRole, count }),
  });

  if (!res.ok) {
    throw new Error('Failed to generate questions');
  }

  return await res.json();
}

export async function analyseAnswer(question: any, answer: string, resumeText: string) {
  const token = await getAuthToken();

  const res = await fetch(`${API_BASE}/interview/analyse-answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ question, answer, resumeText }),
  });

  if (!res.ok) {
    throw new Error('Failed to analyse answer');
  }

  return await res.json();
}

export async function generateReport(candidateName: string, questions: any[], answers: any[], analyses: any[]) {
  const token = await getAuthToken();

  const res = await fetch(`${API_BASE}/interview/generate-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ candidateName, questions, answers, analyses }),
  });

  if (!res.ok) {
    throw new Error('Failed to generate report');
  }

  return await res.json();
}

export async function saveInterview(data: {
  resumeId?: string;
  candidateName: string;
  suggestedRole: string;
  questions: any[];
  answers: any;
  analyses: any;
  emotionLog: any[];
  report: any;
}) {
  const token = await getAuthToken();

  const res = await fetch(`${API_BASE}/interview/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error('Failed to save interview');
  }

  return await res.json();
}

export async function getInterviews() {
  const token = await getAuthToken();

  const res = await fetch(`${API_BASE}/interviews`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch interviews');
  }

  return await res.json();
}

export async function getInterview(id: string) {
  const token = await getAuthToken();

  const res = await fetch(`${API_BASE}/interviews/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Interview not found');
  }

  return await res.json();
}

export async function getCredits() {
  const token = await getAuthToken();

  const res = await fetch(`${API_BASE}/user/credits`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch credits');
  }

  return await res.json();
}
