const jobId = window.__jobId;
const stage = document.getElementById('stage');
const bar = document.getElementById('bar');
const warnings = document.getElementById('warnings');
const progressPercent = document.getElementById('progressPercent');
const progressStageLabels = window.__progressStageLabels ?? {};

const es = new EventSource(`/api/v1/jobs/${jobId}/events`);

function applyProgress(payload) {
    if (payload.stage) stage.textContent = progressStageLabels[payload.stage] ?? payload.stage.replaceAll('_', ' ');
    if (payload.percent !== undefined) {
        bar.style.width = payload.percent + '%';
        bar.textContent = payload.percent + '%';
        progressPercent.textContent = payload.percent + '%';
    }
}

function parseEvent(data) {
    try { return JSON.parse(JSON.parse(data)); } catch (_) { return JSON.parse(data); }
}

function appendAlert(parent, cls, text) {
    const div = document.createElement('div');
    div.className = cls;
    div.textContent = text;
    parent.appendChild(div);
}

es.addEventListener('stage', (e) => applyProgress(parseEvent(e.data)));
es.addEventListener('progress', (e) => applyProgress(parseEvent(e.data)));

es.addEventListener('warning', (e) => {
    const data = parseEvent(e.data);
    appendAlert(warnings, 'alert alert-warning', `${data.code}: ${data.message}`);
});

es.addEventListener('done', () => {
    es.close();
    window.location.href = `/jobs/${jobId}/result`;
});

es.addEventListener('error', (e) => {
    if (e && e.data) {
        const data = parseEvent(e.data);
        warnings.replaceChildren();
        appendAlert(warnings, 'alert alert-danger', `${data.code}: ${data.message}`);
    }
    es.close();
});
