export const getTotalCommits = async (accessToken, createdAt) => {
  const startYear = new Date(createdAt).getUTCFullYear();
  const currentYear = new Date().getUTCFullYear();

  let totalCommits = 0;

  for (let year = startYear; year <= currentYear; year++) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = `${year}-12-31T23:59:59Z`;

    const query = `
      query {
        viewer {
          contributionsCollection(from: "${from}", to: "${to}") {
            totalCommitContributions
          }
        }
      }
    `;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error("GitHub GraphQL returned errors:", result.errors);
      throw new Error("GitHub GraphQL error: " + JSON.stringify(result.errors));
    }

    if (!result.data || !result.data.viewer) {
      console.error("GitHub GraphQL returned invalid data:", result);
      throw new Error(`Invalid GitHub GraphQL response: ${JSON.stringify(result)}`);
    }

    const yearCommits = result.data.viewer.contributionsCollection.totalCommitContributions;
    totalCommits += yearCommits;
  }

  return totalCommits;
};

export const getMaxStreak = async (accessToken) => {
  const query = `
    query {
      viewer {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error(result.errors);
    throw new Error("GraphQL error");
  }

  const days = result.data.viewer.contributionsCollection.contributionCalendar.weeks.flatMap((week) => week.contributionDays);

  let currentStreak = 0;
  let maxStreak = 0;

  for (const day of days) {
    if (day.contributionCount > 0) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
};
