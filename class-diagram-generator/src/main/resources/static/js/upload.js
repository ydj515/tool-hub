document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData();
    fd.append('file', form.file.files[0]);
    fd.append('programName', form.programName.value);
    fd.append('version', form.version.value);
    fd.append('language', form.language.value);
    const formats = Array.from(form.querySelectorAll('input[name=formats]:checked')).map(i => i.value).join(',');
    fd.append('formats', formats);

    const res = await fetch('/api/v1/jobs', { method: 'POST', body: fd });
    if (!res.ok) {
        const err = await res.json();
        alert('Error: ' + (err.detail || res.statusText));
        return;
    }
    const body = await res.json();
    window.location.href = `/jobs/${body.jobId}`;
});
