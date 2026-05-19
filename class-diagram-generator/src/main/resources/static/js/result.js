const jobId = window.__jobId;

function td(text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
}

function downloadCell(url) {
    const cell = document.createElement('td');
    const a = document.createElement('a');
    a.className = 'btn btn-sm btn-primary';
    a.href = url;
    a.textContent = 'Download';
    cell.appendChild(a);
    return cell;
}

async function load() {
    const res = await fetch(`/api/v1/jobs/${jobId}/result`);
    if (!res.ok) {
        const banner = document.createElement('div');
        banner.className = 'alert alert-danger';
        banner.textContent = 'Failed to load result';
        document.body.prepend(banner);
        return;
    }
    const data = await res.json();
    document.getElementById('expiresAt').textContent = data.expiresAt || '-';
    const tbody = document.getElementById('artifacts');
    data.artifacts.forEach(a => {
        const tr = document.createElement('tr');
        tr.appendChild(td(a.module));
        tr.appendChild(td(a.format));
        tr.appendChild(td(a.filename));
        tr.appendChild(td(String(a.sizeBytes)));
        tr.appendChild(downloadCell(a.downloadUrl));
        tbody.appendChild(tr);
    });
    document.getElementById('bundleBtn').setAttribute('href', data.bundleUrl);
}

load();
