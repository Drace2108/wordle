import random

words = [
    "apple",
    "bread",
    "chair",
    "dance",
    "eagle",
    "flame",
    "grass",
    "house",
    "juice",
    "knife",
    "lemon",
    "mango",
    "noise",
    "olive",
    "peach",
    "quest",
    "river",
    "stone",
    "tiger",
    "unity"
]
word = random.choice(words)

for i in range(6):
    while True:
        guess = str(input("Guess the word: ")).lower()
        if len(guess) != 5 or guess not in words:
            print("Invalid input. Please enter a word with 5 characters.")
        else:
            break
    
    output = ['_']*5
    for i in range(5):
        if guess[i] == word[i]:
            output[i] = "O"
        elif guess[i] in word:
            output[i] = "?"
        else:
            output[i] = "_"
    print("Output:", ''.join(output))
    if (guess == word):
        print("You win!")
        break