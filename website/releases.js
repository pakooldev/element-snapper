document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("releases-container");

  try {
    const response = await fetch("data/releases.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const releases = await response.json();

    if (releases.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;">No releases found.</div>`;
      return;
    }

    container.innerHTML = "";

    releases.forEach((release) => {
      const releaseElement = document.createElement("div");
      releaseElement.className = "release-card glass-panel";

      const highlightsHtml = release.highlights
        .map((highlight) => `<li><span style="color: var(--accent-primary); margin-right: 8px;">✨</span>${highlight}</li>`)
        .join("");

      releaseElement.innerHTML = `
        <div class="release-header">
          <h2 class="release-version">${release.version}</h2>
          <span class="release-date">${release.date}</span>
        </div>
        <p class="release-summary">${release.summary}</p>
        <div class="release-highlights">
          <h3>Highlights</h3>
          <ul>
            ${highlightsHtml}
          </ul>
        </div>
      `;

      container.appendChild(releaseElement);
    });
  } catch (error) {
    console.error("Failed to load releases:", error);
    container.innerHTML = `<div style="text-align: center; color: var(--error); padding: 40px;">Failed to load release notes. Please try again later.</div>`;
  }
});
