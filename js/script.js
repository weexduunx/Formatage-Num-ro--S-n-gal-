// Global variables
let correctedData = [];
let originalData = [];
let corrections = [];

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('csvContent').value = e.target.result;
        };
        reader.readAsText(file);
    }
}

function processPhoneNumbers() {
    const csvContent = document.getElementById('csvContent').value.trim();
    
    if (!csvContent) {
        showStatus('Veuillez d’abord télécharger un fichier CSV ou coller le contenu CSV.', 'error');
        return;
    }

    showStatus('Traitement des numéros de téléphone...', 'processing');
    
    try {
        // Parse CSV
        const parsed = Papa.parse(csvContent, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true,
            dynamicTyping: false
        });

        if (parsed.errors.length > 0) {
            console.warn('CSV parsing warnings:', parsed.errors);
        }

        originalData = parsed.data;
        let totalCount = 0;
        let correctedCount = 0;
        let alreadyCorrectCount = 0;
        corrections = [];

        // Process each row
        correctedData = originalData.map(row => {
            const name = row.name ? row.name.trim() : '';
            const phone = row.phone ? row.phone.trim() : '';
            
            if (!phone) return row;
            
            totalCount++;
            let correctedPhone = phone;
            let status = 'No change';
            
            // Check if phone number starts with +
            // if (!phone.startsWith('+')) {
            //     // Add + to the beginning
            //     correctedPhone = '+' + phone;
            //     correctedCount++;
            //     status = 'Corrected';
                
            //     // Track the correction
            //     corrections.push({
            //         name: name,
            //         original: phone,
            //         corrected: correctedPhone,
            //         status: status
            //     });
            // } else {
            //     alreadyCorrectCount++;
            //     status = 'Already correct';
            // }
            // Vérification et correction des numéros sénégalais
            const phoneDigits = phone.replace(/[\s\-\(\)]/g, ''); // Nettoyer les espaces et caractères spéciaux
            
            // Vérifier si c'est déjà un numéro international sénégalais complet (+221XXXXXXXXX)
            if (phoneDigits.match(/^\+221(77|76|70|78)\d{7}$/)) {
                alreadyCorrectCount++;
                status = 'Déjà correct';
                correctedPhone = phoneDigits;
            }
            // Vérifier si c'est un numéro avec préfixe 221 sans le + (221XXXXXXXXX)
            else if (phoneDigits.match(/^221(77|76|70|78)\d{7}$/)) {
                correctedPhone = '+' + phoneDigits;
                correctedCount++;
                status = 'Corrigé (+ Ajouté)';
                
                corrections.push({
                    name: name,
                    original: phone,
                    corrected: correctedPhone,
                    status: status
                });
            }
            // Vérifier si c'est un numéro local sénégalais (77/76/70/78 + 7 chiffres)
            else if (phoneDigits.match(/^(77|76|70|78)\d{7}$/)) {
                correctedPhone = '+221' + phoneDigits;
                correctedCount++;
                status = 'Corrigé (+221 Ajouté)';
                
                corrections.push({
                    name: name,
                    original: phone,
                    corrected: correctedPhone,
                    status: status
                });
            }
            // Si le numéro commence par + mais n'est pas sénégalais ou mal formaté
            else if (phoneDigits.startsWith('+') && !phoneDigits.match(/^\+221(77|76|70|78)\d{7}$/)) {
                status = 'Format invalide';
                correctedPhone = phone; // Garder tel quel
            }
            // Autres numéros sans + qui ne correspondent pas au format sénégalais
            else if (!phoneDigits.startsWith('+')) {
                // Essayer d'ajouter +221 si ça ressemble à un numéro sénégalais incomplet
                if (phoneDigits.match(/^\d{9}$/) && (phoneDigits.startsWith('77') || phoneDigits.startsWith('76') || phoneDigits.startsWith('70') || phoneDigits.startsWith('78'))) {
                    correctedPhone = '+221' + phoneDigits;
                    correctedCount++;
                    status = 'Corrigé (+221 Ajouté)';
                    
                    corrections.push({
                        name: name,
                        original: phone,
                        corrected: correctedPhone,
                        status: status
                    });
                } else {
                    status = 'Format Invalide';
                    correctedPhone = phone; // Garder tel quel
                }
            }
            else {
                status = 'Format invalide';
                correctedPhone = phone; // Garder tel quel
            }

            return {
                ...row,
                phone: correctedPhone,
                originalPhone: phone,
                status: status
            };
        });

        // Update statistics
        document.getElementById('totalCount').textContent = totalCount;
        document.getElementById('correctedCount').textContent = correctedCount;
        document.getElementById('alreadyCorrectCount').textContent = alreadyCorrectCount;

        // Show results
        showStatus(`✅ Traitement terminé! ${correctedCount} les numéros de téléphone ont été corrigés.`, 'success');
        document.getElementById('resultsSection').style.display = 'block';
        
        // Show preview of corrections
        displayPreview();

    } catch (error) {
        console.error('Error processing CSV:', error);
        showStatus(`❌ Erreur lors du traitement du fichier CSV: ${error.message}`, 'error');
    }
}

function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
}

function displayPreview() {
    const tbody = document.getElementById('previewBody');
    tbody.innerHTML = '';

    // Show first 50 rows with corrections highlighted
    const previewData = correctedData.slice(0, 50);
    
    previewData.forEach(row => {
        const tr = document.createElement('tr');
        const wasCorrected = row.status === 'Corrected';
        
        if (wasCorrected) {
            tr.className = 'corrected';
        }
        
        tr.innerHTML = `
            <td>${row.name || ''}</td>
            <td>${row.originalPhone || ''}</td>
            <td>${row.phone || ''}</td>
            <td>${row.status || ''}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

function downloadCorrectedCSV() {
    if (correctedData.length === 0) {
        alert('No data to download. Please process the CSV first.');
        return;
    }

    // Prepare data for download (remove helper columns)
    const downloadData = correctedData.map(row => ({
        name: row.name,
        phone: row.phone
    }));

    const csv = Papa.unparse(downloadData, {
        delimiter: ':',
        header: true
    });

    downloadFile(csv, 'Employes-contratActif-2025-phoneCorrected.csv', 'text/csv');
}

function downloadCorrectedList() {
    if (corrections.length === 0) {
        alert('No corrections were made!');
        return;
    }

    const csv = Papa.unparse(corrections, {
        delimiter: ':',
        header: true
    });

    downloadFile(csv, 'phone-corrections-list.csv', 'text/csv');
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Pre-populate with the provided data
window.onload = function() {
    const sampleData = `name;phone
IDRISSA NDIOUCK;+221784673070
WELIMATA NDIOUCK;221771234567
SENEGAL NDIAYE;332211234
NDAKAROU DIAL DIOP;791234567
NDAKAROU DIAL DIOP;781234567`;
    
    document.getElementById('csvContent').value = sampleData;
};
