"""Streak computation from a set of activity dates."""

from datetime import date, timedelta


def compute_streak(dates: set[date], today: date) -> tuple[int, int]:
    """Return (current, longest) consecutive-day streaks.

    Current counts the run ending today or yesterday (so it stays alive on a
    day you haven't logged yet); it is 0 if the most recent activity is older
    than yesterday. Longest is the longest run anywhere in the set.
    """
    if not dates:
        return 0, 0

    longest = 1
    run = 1
    ordered = sorted(dates)
    for previous, current in zip(ordered, ordered[1:]):
        if current - previous == timedelta(days=1):
            run += 1
        else:
            run = 1
        longest = max(longest, run)

    current_streak = 0
    if today in dates or (today - timedelta(days=1)) in dates:
        cursor = today if today in dates else today - timedelta(days=1)
        while cursor in dates:
            current_streak += 1
            cursor -= timedelta(days=1)

    return current_streak, longest
