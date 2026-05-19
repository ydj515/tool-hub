const form = document.getElementById('uploadForm');

if (form) {
    const fileInput = form.querySelector('[data-upload-input]');
    const dropzone = form.querySelector('[data-upload-dropzone]');
    const filename = form.querySelector('[data-upload-filename]');
    const sizeEl = form.querySelector('[data-upload-size]');
    const changeBtn = form.querySelector('[data-upload-change]');
    const removeBtn = form.querySelector('[data-upload-remove]');
    const emptyLabel = filename?.dataset.emptyLabel ?? '';
    const invalidTypeMessage = fileInput?.dataset.invalidTypeMessage ?? '';

    const isZipFile = (file) => file && file.name.toLowerCase().endsWith('.zip');

    const formatBytes = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        const mb = kb / 1024;
        if (mb < 1024) return `${mb.toFixed(2)} MB`;
        return `${(mb / 1024).toFixed(2)} GB`;
    };

    const updateFilename = (file) => {
        if (filename) filename.textContent = file ? file.name : emptyLabel;
        if (sizeEl) sizeEl.textContent = file ? formatBytes(file.size) : '';
        if (!dropzone) return;
        if (file && isZipFile(file)) {
            dropzone.classList.add('is-selected');
        } else {
            dropzone.classList.remove('is-selected');
        }
    };

    const syncValidity = (file) => {
        if (!fileInput) return;
        fileInput.setCustomValidity(file && !isZipFile(file) ? invalidTypeMessage : '');
    };

    const assignFile = (file) => {
        if (!fileInput || !file) return;
        const transfer = new DataTransfer();
        transfer.items.add(file);
        fileInput.files = transfer.files;
        syncValidity(file);
        updateFilename(file);
    };

    const clearDragState = () => {
        if (!dropzone) return;
        dropzone.classList.remove('is-dragover');
    };

    fileInput?.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        syncValidity(file);
        updateFilename(file);
    });

    changeBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        fileInput?.click();
    });

    removeBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!fileInput) return;
        fileInput.value = '';
        syncValidity(undefined);
        updateFilename(undefined);
    });

    dropzone?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        fileInput?.click();
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
        dropzone?.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropzone.classList.add('is-dragover');
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy';
            }
        });
    });

    ['dragleave', 'dragend'].forEach((eventName) => {
        dropzone?.addEventListener(eventName, (event) => {
            if (event.target === dropzone) {
                clearDragState();
            }
        });
    });

    dropzone?.addEventListener('drop', (event) => {
        event.preventDefault();
        clearDragState();
        const file = event.dataTransfer?.files?.[0];
        if (!file) return;
        assignFile(file);
        if (!isZipFile(file)) {
            fileInput?.reportValidity();
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const file = fileInput?.files?.[0];
        syncValidity(file);

        if (!form.reportValidity() || !file) {
            fileInput?.reportValidity();
            return;
        }

        const fd = new FormData();
        fd.append('file', file);
        fd.append('programName', form.programName.value);
        fd.append('version', form.version.value);
        fd.append('language', form.language.value);
        const formats = Array.from(form.querySelectorAll('input[name=formats]:checked')).map((input) => input.value).join(',');
        fd.append('formats', formats);
        fd.append('includeDiagrams', form.includeDiagrams?.checked ? 'true' : 'false');

        const res = await fetch('/api/v1/jobs', { method: 'POST', body: fd });
        if (!res.ok) {
            const err = await res.json();
            alert('Error: ' + (err.detail || res.statusText));
            return;
        }
        const body = await res.json();
        window.location.href = `/jobs/${body.jobId}`;
    });
}
