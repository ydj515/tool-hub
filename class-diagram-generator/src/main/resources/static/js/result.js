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

async function load() {
    const res = await fetch(`/api/v1/jobs/${jobId}/result`);
    if (!res.ok) {
        const banner = el('div', 'alert alert-danger', resultLabels.loadError);
        document.body.prepend(banner);
        return;
    }
    const data = await res.json();
    document.getElementById('expiresAt').textContent = formatDate(data.expiresAt);
    document.getElementById('artifactCount').textContent = String(data.artifacts.length);
    const grid = document.getElementById('artifacts');
    grid.replaceChildren();
    data.artifacts.forEach((a) => grid.appendChild(buildArtifactCard(a)));
    document.getElementById('bundleBtn').setAttribute('href', data.bundleUrl);
}

load();
