const jobId = window.__jobId;
const stage = document.getElementById('stage');
const bar = document.getElementById('bar');
const warnings = document.getElementById('warnings');
const progressPercent = document.getElementById('progressPercent');
const progressStageLabels = window.__progressStageLabels ?? {};
const progressUiLabels = window.__progressUiLabels ?? {};

const stageToStep = {
    EXTRACTING: 'intake',
    DETECTING_MODULES: 'intake',
    PARSING: 'analysis',
    CLASSIFYING: 'analysis',
    ASSIGNING_IDS: 'analysis',
    EXTRACTING_RELATIONS: 'diagrams',
    RENDERING_DIAGRAMS: 'diagrams',
    RENDERING_DOCX: 'rendering',
    RENDERING_XLSX: 'rendering',
    RENDERING_MD: 'rendering',
    PACKAGING: 'packaging',
};
const stepOrder = ['intake', 'analysis', 'diagrams', 'rendering', 'packaging'];

function applyTimeline(stageKey) {
    const currentStep = stageToStep[stageKey];
    if (!currentStep) return;
    const activeIdx = stepOrder.indexOf(currentStep);
    document.querySelectorAll('.timeline__step').forEach((el) => {
        const idx = stepOrder.indexOf(el.dataset.step);
        el.classList.toggle('is-done', idx < activeIdx);
        el.classList.toggle('is-active', idx === activeIdx);
    });
}

const es = new EventSource(`/api/v1/jobs/${jobId}/events`);

function applyProgress(payload) {
    if (payload.stage) {
        stage.textContent = progressStageLabels[payload.stage] ?? payload.stage.replaceAll('_', ' ');
        applyTimeline(payload.stage);
    }
    if (payload.percent !== undefined) {
        bar.style.width = payload.percent + '%';
        progressPercent.textContent = payload.percent + '%';
    }
}

function parseEvent(data) {
    return JSON.parse(data);
}

function appendAlert(parent, cls, text) {
    const div = document.createElement('div');
    div.className = cls;
    div.textContent = text;
    parent.appendChild(div);
}

function renderIdleState() {
    if (!warnings) return;
    warnings.replaceChildren();
    const div = document.createElement('div');
    div.className = 'mmu-info-card';
    div.textContent = progressUiLabels.idle ?? '작업을 시작했고 다음 단계 이벤트를 기다리는 중입니다.';
    warnings.appendChild(div);
}

renderIdleState();

es.addEventListener('stage', (e) => applyProgress(parseEvent(e.data)));
es.addEventListener('progress', (e) => applyProgress(parseEvent(e.data)));

es.addEventListener('warning', (e) => {
    const data = parseEvent(e.data);
    if (warnings.querySelector('.mmu-info-card')) {
        warnings.replaceChildren();
    }
    appendAlert(warnings, 'mmu-warning-card', `${data.code}: ${data.message}`);
});

es.addEventListener('done', () => {
    es.close();
    window.location.href = `/jobs/${jobId}/result`;
});

es.addEventListener('error', (e) => {
    if (e && e.data) {
        const data = parseEvent(e.data);
        warnings.replaceChildren();
        appendAlert(warnings, 'mmu-warning-card', `${data.code}: ${data.message}`);
    }
    es.close();
});
