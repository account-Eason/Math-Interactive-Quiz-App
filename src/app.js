const qUrl = '/src/questions.json';

const el = (id) => document.getElementById(id);
const choiceTemplate = document.getElementById('choice-template');

let questions = [];
let currentIndex = 0;
let score = 0;
let settings = { shuffleQ: false, shuffleA: true };

function setFromUI() {
  settings.shuffleQ = el('shuffleQ').checked;
  settings.shuffleA = el('shuffleA').checked;
}

function saveHighScore() {
  const prev = Number(localStorage.getItem('math_quiz_high') || 0);
  if (score > prev) localStorage.setItem('math_quiz_high', String(score));
}

function readHighScore() {
  const v = localStorage.getItem('math_quiz_high');
  el('highScore').textContent = v ? v : '—';
}

function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function prepareQuestions(raw) {
  const list = raw.map(q => ({...q}));
  if (settings.shuffleQ) shuffleArray(list);
  return list;
}

function renderQuestion() {
  const q = questions[currentIndex];
  el('current').textContent = currentIndex + 1;
  el('total').textContent = questions.length;
  el('scoreVal').textContent = score;

  const questionEl = el('question');
  const choicesEl = el('choices');
  choicesEl.innerHTML = '';

  questionEl.textContent = q.question;

  // Prepare choices as {text, originalIndex}
  const choices = q.choices.map((c, i) => ({ text: c, i }));
  if (settings.shuffleA) shuffleArray(choices);

  choices.forEach((cObj, idx) => {
    const node = choiceTemplate.content.cloneNode(true);
    const li = node.querySelector('li');
    const btn = node.querySelector('button');
    btn.textContent = cObj.text;
    btn.setAttribute('data-choice-idx', cObj.i);
    btn.addEventListener('click', () => onSelect(btn, q));
    choicesEl.appendChild(li);
  });

  el('nextBtn').disabled = true;
}

function onSelect(button, q) {
  // disable all buttons
  const buttons = Array.from(document.querySelectorAll('.choice-btn'));
  buttons.forEach(b => b.disabled = true);

  const selectedIdx = Number(button.getAttribute('data-choice-idx'));
  const correctIdx = q.answer;

  if (selectedIdx === correctIdx) {
    button.classList.add('correct');
    score += 1;
  } else {
    button.classList.add('wrong');
    // highlight correct button
    const allBtns = Array.from(document.querySelectorAll('.choice-btn'));
    const correctBtn = allBtns.find(b => Number(b.getAttribute('data-choice-idx')) === correctIdx);
    if (correctBtn) correctBtn.classList.add('correct');
  }

  el('scoreVal').textContent = score;
  el('nextBtn').disabled = false;
}

function nextQuestion() {
  currentIndex += 1;
  if (currentIndex >= questions.length) {
    finishQuiz();
    return;
  }
  renderQuestion();
}

function finishQuiz() {
  saveHighScore();
  readHighScore();
  // Show result inside question area
  const questionEl = el('question');
  const choicesEl = el('choices');
  questionEl.textContent = `Quiz finished — your score: ${score} / ${questions.length}`;
  choicesEl.innerHTML = '';

  const expl = document.createElement('div');
  expl.className = 'explanation';
  expl.style.marginTop = '12px';
  expl.textContent = 'Thanks for playing. You can restart to try again.';
  choicesEl.appendChild(expl);

  el('nextBtn').hidden = true;
  el('restartBtn').hidden = false;
}

function restart() {
  setFromUI();
  currentIndex = 0;
  score = 0;
  el('nextBtn').hidden = false;
  el('restartBtn').hidden = true;
  el('nextBtn').disabled = true;
  loadQuestionsAndStart();
}

async function loadQuestionsAndStart() {
  try {
    const resp = await fetch(qUrl, { cache: 'no-store' });
    if (!resp.ok) throw new Error('Failed to load questions');
    const raw = await resp.json();
    setFromUI();
    questions = prepareQuestions(raw);
    currentIndex = 0;
    score = 0;
    renderQuestion();
    readHighScore();
  } catch (err) {
    el('question').textContent = 'Could not load questions.';
    console.error(err);
  }
}

// Wire up UI
el('nextBtn').addEventListener('click', () => nextQuestion());
el('restartBtn').addEventListener('click', () => restart());

el('shuffleQ').addEventListener('change', () => {
  localStorage.setItem('mq_shuffleQ', String(el('shuffleQ').checked));
});
el('shuffleA').addEventListener('change', () => {
  localStorage.setItem('mq_shuffleA', String(el('shuffleA').checked));
});

// Load saved settings
(function loadSettings() {
  const sQ = localStorage.getItem('mq_shuffleQ');
  const sA = localStorage.getItem('mq_shuffleA');
  if (sQ !== null) el('shuffleQ').checked = sQ === 'true';
  if (sA !== null) el('shuffleA').checked = sA === 'true';
})();

// Start
loadQuestionsAndStart();

// Accessibility: allow keyboard selection (1-4)
document.addEventListener('keydown', (e) => {
  const k = e.key;
  if (/^[1-9]$/.test(k)) {
    const idx = Number(k) - 1;
    const buttons = Array.from(document.querySelectorAll('.choice-btn'));
    if (buttons[idx] && !buttons[idx].disabled) buttons[idx].click();
  }
});
