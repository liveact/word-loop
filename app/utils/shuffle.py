import random


def fisher_yates_shuffle(items: list) -> list:
    """Return a new list with elements randomly shuffled using Fisher-Yates algorithm."""
    result = items.copy()
    for i in range(len(result) - 1, 0, -1):
        j = random.randint(0, i)
        result[i], result[j] = result[j], result[i]
    return result
