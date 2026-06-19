document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dateEntryForm');
  const nativeInput = document.getElementById('nativeDateInput');
  const displayYear = document.getElementById('displayYear');
  const displayMonth = document.getElementById('displayMonth');
  const displayDay = document.getElementById('displayDay');

  // Calculate tomorrow's date relative to the user's current local time
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${yyyy}-${mm}-${dd}`;

  // Set default value for the native date input
  nativeInput.value = tomorrowStr;

  // Function to synchronize the custom visual spans with the native input's value
  function syncDisplay() {
    const value = nativeInput.value;
    if (value) {
      const [year, month, day] = value.split('-');
      displayYear.textContent = year;
      displayMonth.textContent = month;
      displayDay.textContent = day;
    }
  }

  // Initial sync to set tomorrow's date on screen
  syncDisplay();

  // Listen for changes on the native date input
  nativeInput.addEventListener('input', syncDisplay);
  nativeInput.addEventListener('change', syncDisplay);

  // Handle Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = nativeInput.value;
    if (value) {
      const [year, month, day] = value.split('-');
      // Strip leading zeros for clean query parameters (e.g. month=6 instead of month=06)
      const m = parseInt(month, 10);
      const d = parseInt(day, 10);
      const y = parseInt(year, 10);

      // Redirect to the article page with query string parameters
      window.location.href = `article.html?month=${m}&day=${d}&year=${y}`;
    }
  });
});
