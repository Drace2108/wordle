# Project Title

Server/client wordle that supports multiple-player (similar to [wewordle](https://wewordle.org/)) and host cheating (similar to [absurdle](https://absurdle.online/)).

## Description

This is a multiplayer version of the popular Wordle game, where two players can play together and see each other's progress in real-time. Server is built using Node.js, Express, SQLite, and ws. Client is built using React.js.

## Getting Started

### Installing

#### Install server dependencies:

```
cd server
npm install
```

#### Install client dependencies:

```
cd client
npm install
```

### Executing program

#### Run server or client in the directory:
```
npm start
```

### Playing game
1. Run server and two clients to have two players
2. Player 1 has to set a list of words and number of guesses
3. Players have to guess a word from list of words within limited number of guesses
4. Player 1 always starts first
5. First to guess the word is winner

Output schema:
* '0' stands for Hit (the letter is in the correct spot of answer)
* '?' stands for Present (the letter is in the answer but wrong spot)
* '_' stands for Miss (the letter is not in the answer)

### Demo
https://github.com/user-attachments/assets/ffab668d-870a-4945-a193-44c952441a77

## Authors

[Daulet Igazin](https://github.com/Drace2108)
