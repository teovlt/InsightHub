export const getTotalCommits = async (accessToken) => {
  const query = `
    query {
      viewer {
        contributionsCollection {
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
    throw new Error("GitHub GraphQL error: " + JSON.stringify(result.errors));
  }

  return result.data.viewer.contributionsCollection.totalCommitContributions;
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
