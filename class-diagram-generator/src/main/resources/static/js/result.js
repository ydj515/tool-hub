const jobId = window.__jobId;
const resultLocale = window.__resultLocale ?? undefined;
const resultLabels = window.__resultLabels ?? {
    download: 'Download',
    loadError: 'Failed to load result',
};

function td(text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
}

function downloadCell(url) {
    const cell = document.createElement('td');
    const a = document.createElement('a');
    a.className = 'btn btn-sm btn-primary btn-with-icon';
    a.href = url;
    a.innerHTML = `<i class="bi bi-download"></i><span>${resultLabels.download}</span>`;
    cell.appendChild(a);
    return cell;
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString(resultLocale);
}

async function load() {
    const res = await fetch(`/api/v1/jobs/${jobId}/result`);
    if (!res.ok) {
        const banner = document.createElement('div');
        banner.className = 'alert alert-danger';
        banner.textContent = resultLabels.loadError;
        document.body.prepend(banner);
        return;
    }
    const data = await res.json();
    document.getElementById('expiresAt').textContent = formatDate(data.expiresAt);
    document.getElementById('artifactCount').textContent = String(data.artifacts.length);
    const tbody = document.getElementById('artifacts');
    data.artifacts.forEach(a => {
        const tr = document.createElement('tr');
        tr.appendChild(td(a.module));
        tr.appendChild(td(a.format));
        tr.appendChild(td(a.filename));
        tr.appendChild(td(a.sizeLabel ?? String(a.sizeBytes)));
        tr.appendChild(downloadCell(a.downloadUrl));
        tbody.appendChild(tr);
    });
    document.getElementById('bundleBtn').setAttribute('href', data.bundleUrl);
}

load();
