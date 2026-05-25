const jobId = window.__jobId;
const resultLocale = window.__resultLocale ?? undefined;
const resultLabels = window.__resultLabels ?? {
    download: 'Download',
    loadError: 'Failed to load result',
};

const formatIcons = {
    docx: 'bi-file-earmark-word',
    xlsx: 'bi-file-earmark-spreadsheet',
    md: 'bi-markdown',
};

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function icon(name) {
    const i = document.createElement('i');
    i.className = `bi ${name}`;
    i.setAttribute('aria-hidden', 'true');
    return i;
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString(resultLocale);
}

function buildArtifactCard(a) {
    const card = el('article', 'artifact-card');
    card.setAttribute('role', 'listitem');

    const fmt = (a.format ?? '').toLowerCase();
    const iconName = formatIcons[fmt] ?? 'bi-file-earmark';

    const header = el('div', 'artifact-card__header');
    const chip = el('span', `artifact-format artifact-format--${fmt}`);
    chip.append(icon(iconName), el('span', null, a.format ?? ''));
    header.append(chip, el('span', 'artifact-size', a.sizeLabel ?? String(a.sizeBytes ?? '')));

    const footer = el('div', 'artifact-card__footer');
    const link = el('a', 'btn btn-sm btn-primary btn-with-icon');
    link.href = a.downloadUrl;
    link.append(icon('bi-download'), el('span', null, resultLabels.download));
    footer.appendChild(link);

    card.append(
        header,
        el('div', 'artifact-module', a.module ?? ''),
        el('div', 'artifact-filename', a.filename ?? ''),
        footer,
    );
    return card;
}

function buildFormatDownloadButton(item) {
    const format = (item.format ?? '').toUpperCase();
    const hint = item.archive ? resultLabels.archiveHint : resultLabels.directHint;
    const link = el('a', 'btn btn-outline-primary btn-sm btn-with-icon');
    link.href = item.downloadUrl;
    link.append(
        icon('bi-download'),
        el('span', null, `${format} ${resultLabels.download}`),
    );
    link.title = `${resultLabels.formatDownloadsTitle}: ${hint}`;
    return link;
}

function renderWarnings(list) {
    const section = document.getElementById('resultWarnings');
    const container = document.getElementById('resultWarningsList');
    if (!section || !container) return;
    if (!list.length) {
        section.hidden = true;
        container.replaceChildren();
        return;
    }

    section.hidden = false;
    container.replaceChildren();
    list.forEach((warning) => {
        const card = el('article', 'mmu-warning-card');
        const title = el('strong', 'mmu-warning-card__code', warning.code ?? '');
        const body = el('p', 'mmu-warning-card__message', warning.message ?? '');
        card.append(title, body);
        container.appendChild(card);
    });
}

function renderFormatDownloads(list) {
    const container = document.getElementById('formatDownloads');
    if (!container) return;
    container.replaceChildren();
    list.forEach((item) => {
        container.appendChild(buildFormatDownloadButton(item));
    });
}

async function load() {
    const res = await fetch(`/api/v1/jobs/${jobId}/result`);
    if (!res.ok) {
        const banner = el('div', 'alert alert-danger', resultLabels.loadError);
        document.body.prepend(banner);
        return;
    }
    const data = await res.json();
    document.getElementById('createdAt').textContent = formatDate(data.createdAt);
    document.getElementById('expiresAt').textContent = formatDate(data.expiresAt);
    document.getElementById('artifactCount').textContent = String(data.artifacts.length);
    renderWarnings(data.warnings ?? []);
    renderFormatDownloads(data.formatDownloads ?? []);
    const grid = document.getElementById('artifacts');
    grid.replaceChildren();
    data.artifacts.forEach((a) => grid.appendChild(buildArtifactCard(a)));
    document.getElementById('bundleBtn').setAttribute('href', data.bundleUrl);
}

load();
