document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

            // Create participants list HTML
            let participantsHTML = "";
            if (details.participants && details.participants.length > 0) {
              participantsHTML = `
                <div class="participants-section">
                  <strong>Participants:</strong>
                  <ul class="participants-list">
                    ${details.participants.map(email => `
                      <li data-email="${email}">
                        <span class="participant-email">${email}</span>
                        <span class="delete-participant" title="Remove participant">&times;</span>
                      </li>
                    `).join("")}
                  </ul>
                </div>
              `;
            } else {
              participantsHTML = `
                <div class="participants-section empty">
                  <strong>Participants:</strong>
                  <span class="no-participants">No one has signed up yet.</span>
                </div>
              `;
            }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
      // Add event listeners for delete icons
      document.querySelectorAll(".delete-participant").forEach(icon => {
        icon.addEventListener("click", async (e) => {
          const li = e.target.closest("li[data-email]");
          const email = li.getAttribute("data-email");
          // Find the activity name from the card
          const card = e.target.closest(".activity-card");
          const activityName = card.querySelector("h4").textContent;
          if (!activityName || !email) return;

          try {
            const response = await fetch(
              `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
              { method: "POST" }
            );
            const result = await response.json();
            if (response.ok) {
              // Refresh activities list
              fetchActivities();
            } else {
              alert(result.detail || "Failed to remove participant.");
            }
          } catch (error) {
            alert("Failed to remove participant. Please try again.");
          }
        });
      });
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list to show new participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
