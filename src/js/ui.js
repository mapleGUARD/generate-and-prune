import { state, config } from './state.js';

export const screens = {
    landing: document.getElementById('landing-screen'),
    gen: document.getElementById('gen-screen'),
    prune: document.getElementById('prune-screen'),
    result: document.getElementById('result-screen')
};

export function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

export function renderPruneList() {
    const container = document.getElementById('prune-list');
    container.innerHTML = '';

    state.ideas.forEach((idea, index) => {
        const div = document.createElement('div');
        div.className = 'prune-item';
        
        const h3 = document.createElement('h3');
        h3.textContent = idea.text;
        div.appendChild(h3);

        const sliderGroup = document.createElement('div');
        sliderGroup.className = 'slider-group';
        sliderGroup.innerHTML = `
            <span class="slider-label">Originality</span>
            <input type="range" min="1" max="5" value="3" onchange="updateScore(${index}, 'orig', this.value)">
            <span class="slider-label">Viability</span>
            <input type="range" min="1" max="5" value="3" onchange="updateScore(${index}, 'viab', this.value)">
        `;
        div.appendChild(sliderGroup);
        
        container.appendChild(div);
    });
}

export function updateScore(index, type, value) {
    state.ideas[index][type] = parseInt(value);
}

export function renderGlobalStats() {
    const totalSessions = state.historicalSessions.length;
    let totalIdeas = 0;
    let totalPassedRounds = 0;
    let sumOrg = 0;
    let sumViab = 0;

    state.historicalSessions.forEach(s => {
        totalIdeas += s.totalIdeas;
        totalPassedRounds += s.passedRounds;
        sumOrg += s.avgOriginality;
        sumViab += s.avgViability;
    });

    const globalAvgOrg = totalSessions > 0 ? (sumOrg / totalSessions).toFixed(1) : "0.0";
    const globalAvgViab = totalSessions > 0 ? (sumViab / totalSessions).toFixed(1) : "0.0";

    const grid = document.getElementById('global-stats-grid');
    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${totalSessions}</div>
            <div class="stat-label">Sessions Completed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalIdeas}</div>
            <div class="stat-label">Total Ideas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalPassedRounds}</div>
            <div class="stat-label">Rounds Passed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color:var(--primary);">${globalAvgOrg}</div>
            <div class="stat-label">Avg Originality</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color:var(--accent);">${globalAvgViab}</div>
            <div class="stat-label">Avg Viability</div>
        </div>
    `;
}

export function renderGlobalGraph() {
    const history = state.historicalSessions;
    const container = document.getElementById('stats-graph-container');
    container.innerHTML = '';
    
    if (history.length < 1) {
        container.innerHTML = `<p style="text-align: center; color: var(--secondary); padding: 20px;">Complete at least 1 session to see your progress graph!</p>`;
        return;
    }

    const dataPoints = [];
    let cumulativeTotal = 0;
    
    dataPoints.push({ session: 0, total: 0 });

    history.forEach((session, index) => {
        cumulativeTotal += session.totalIdeas;
        dataPoints.push({ session: index + 1, total: cumulativeTotal });
    });

    const maxIdeas = cumulativeTotal;
    const totalSessions = history.length;
    
    const W = 500; 
    const H = 200; 
    const P = 30; 
    
    const yMax = Math.max(maxIdeas * 1.1, 10);
    
    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${W + 2 * P} ${H + 2 * P}" style="background: #fff; border-radius: 8px;">`;
    svg += `<g transform="translate(${P}, ${P})">`;

    for (let i = 0; i <= 5; i++) {
        const val = (yMax / 5) * i;
        const y = H - (i / 5) * H;
        svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="2" />`;
        svg += `<text x="-8" y="${y + 4}" font-size="10" fill="#94a3b8" text-anchor="end">${Math.round(val)}</text>`;
    }
    
    const skip = Math.ceil(totalSessions / 10);
    
    for (let i = 0; i <= totalSessions; i+=skip) {
        const x = (i / totalSessions) * W;
        svg += `<text x="${x}" y="${H + 15}" font-size="10" fill="#94a3b8" text-anchor="middle">${i}</text>`;
    }
    svg += `<text x="${W / 2}" y="${H + 35}" font-size="10" fill="#64748b" text-anchor="middle">Sessions Completed</text>`;

    const points = dataPoints.map(p => {
        const x = (p.session / totalSessions) * W;
        const y = H - (p.total / yMax) * H;
        return `${x},${y}`;
    });

    const areaPoints = [`0,${H}`, ...points, `${points[points.length-1].split(',')[0]},${H}`];
    svg += `<polygon points="${areaPoints.join(' ')}" fill="var(--primary)" fill-opacity="0.1" />`;

    svg += `<polyline fill="none" stroke="var(--primary)" stroke-width="3" points="${points.join(' ')}" stroke-linecap="round" stroke-linejoin="round"/>`;
    
    points.forEach((point, i) => {
        const [x, y] = point.split(',');
        if (totalSessions < 20 || i === points.length - 1) {
            svg += `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="var(--primary)" stroke-width="2" />`;
        }
    });

    svg += `</g></svg>`;
    
    container.innerHTML = `
        <div style="text-align:center; margin-bottom:10px; font-size:0.9rem; color:var(--primary);">
            <strong>Cumulative Ideas Generated: ${cumulativeTotal}</strong>
        </div>
    ` + svg;
}

export function renderSessionMetrics() {
    document.getElementById('summary-total-rounds').innerText = state.sessionResults.length; 

    const summaryDiv = document.getElementById('summary-metrics');
    summaryDiv.innerHTML = '<h3>Round-by-Round Breakdown</h3>';

    let totalIdeaCount = 0;
    let totalAvgOrg = 0;
    let totalAvgViab = 0;
    let passedRounds = 0;
    let bestIdea = null;

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `
        <thead>
            <tr style="background:#e2e8f0;">
                <th style="padding: 8px; border: 1px solid #ccc;">Rnd</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Status</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Ideas</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Avg Org</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Top Score</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    state.sessionResults.forEach(result => {
        const statusColor = result.status === "PASSED" ? 'var(--accent)' : 'var(--danger)';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 8px; border: 1px solid #ccc;">${result.round}</td>
            <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold; color: ${statusColor};">${result.status}</td>
            <td style="padding: 8px; border: 1px solid #ccc;">${result.count}</td>
            <td style="padding: 8px; border: 1px solid #ccc;">${result.avgOriginality.toFixed(1) || 'N/A'}</td>
            <td style="padding: 8px; border: 1px solid #ccc;">${result.topScore ? result.topScore.toFixed(1) : 'N/A'}</td>
        `;
        tbody.appendChild(tr);

        totalIdeaCount += result.count;
        if (result.status === "PASSED") {
            totalAvgOrg += result.avgOriginality;
            totalAvgViab += result.avgViability;
            passedRounds++;
        }

        if (result.topScore && (!bestIdea || result.topScore > bestIdea.score)) {
            bestIdea = { idea: result.topIdea, score: result.topScore, round: result.round };
        }
    });

    summaryDiv.appendChild(table);

    const overallAvgOrg = passedRounds > 0 ? (totalAvgOrg / passedRounds).toFixed(1) : "0.0";
    const overallAvgViab = passedRounds > 0 ? (totalAvgViab / passedRounds).toFixed(1) : "0.0";

    summaryDiv.innerHTML += `
        <h3 style="margin-top: 1.5rem;">Overall Session Metrics (Passed Rounds)</h3>
        <p><strong>Total Rounds Passed:</strong> ${passedRounds} / ${config.TOTAL_ROUNDS}</p>
        <p><strong>Total Ideas Generated:</strong> ${totalIdeaCount}</p>
        <p><strong>Avg Originality (Passed):</strong> ${overallAvgOrg} / 5</p>
        <p><strong>Avg Viability (Passed):</strong> ${overallAvgViab} / 5</p>
        ${bestIdea && bestIdea.score > 0 ? `<p><strong>Best Idea (${bestIdea.score.toFixed(1)}):</strong> "${bestIdea.idea}" (Round ${bestIdea.round})</p>` : ''}
    `;
}

export function renderProgressGraph() {
    const container = document.getElementById('graph-container');
    container.innerHTML = '';
    
    if (state.sessionResults.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--secondary);">No data available for this session.</p>`;
        return;
    }

    const dataPoints = [];
    let cumulativeCount = 0;
    
    dataPoints.push({ round: 0, total: 0 });

    state.sessionResults.forEach(r => {
        cumulativeCount += r.count;
        dataPoints.push({ round: r.round, total: cumulativeCount });
    });

    const maxIdeas = cumulativeCount;
    const maxRounds = Math.max(config.TOTAL_ROUNDS, state.sessionResults[state.sessionResults.length-1].round); 

    const W = 500; 
    const H = 200; 
    const P = 30; 
    
    const yMax = Math.max(maxIdeas * 1.1, 10); 
    
    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${W + 2 * P} ${H + 2 * P}" style="background: #f8fafc; border-radius: 8px;">`;
    svg += `<g transform="translate(${P}, ${P})">`;

    for (let i = 0; i <= 5; i++) {
        const val = (yMax / 5) * i;
        const y = H - (i / 5) * H;
        svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="2" />`;
        svg += `<text x="-8" y="${y + 4}" font-size="10" fill="#94a3b8" text-anchor="end">${Math.round(val)}</text>`;
    }
    
    const xStep = W / maxRounds;
    for (let i = 0; i <= maxRounds; i++) {
        const x = i * xStep;
        svg += `<text x="${x}" y="${H + 15}" font-size="10" fill="#94a3b8" text-anchor="middle">${i}</text>`;
    }
    svg += `<text x="${W / 2}" y="${H + 35}" font-size="10" fill="#64748b" text-anchor="middle">Round Number</text>`;

    const points = dataPoints.map(p => {
        const x = (p.round / maxRounds) * W;
        const y = H - (p.total / yMax) * H;
        return `${x},${y}`;
    });

    const areaPoints = [`0,${H}`, ...points, `${points[points.length-1].split(',')[0]},${H}`];
    svg += `<polygon points="${areaPoints.join(' ')}" fill="var(--primary)" fill-opacity="0.1" />`;

    svg += `<polyline fill="none" stroke="var(--primary)" stroke-width="3" points="${points.join(' ')}" stroke-linecap="round" stroke-linejoin="round"/>`;
    
    points.forEach((point, i) => {
        const [x, y] = point.split(',');
        const val = dataPoints[i].total;
        
        if (i > 0) { 
             svg += `<text x="${x}" y="${y - 10}" font-size="11" fill="var(--primary)" font-weight="bold" text-anchor="middle">${val}</text>`;
        }
        
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="var(--primary)" stroke-width="2" />`;
    });

    svg += `</g></svg>`;

    container.innerHTML = svg;
}
