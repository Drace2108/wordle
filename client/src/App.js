import React from "react";
import "./App.css";

function App() {
  const [guesses, setGuesses] = React.useState(() => {
    const storedGuesses = localStorage.getItem("guesses");
    return storedGuesses ? new Map(JSON.parse(storedGuesses)) : new Map();
  });
  const [words, setWords] = React.useState(
    localStorage.getItem("words")
      ? JSON.parse(localStorage.getItem("words"))
      : []
  );
  const [guess, setGuess] = React.useState(localStorage.getItem("guess") || "");
  const [numberOfGuesses, setNumberOfGuesses] = React.useState(
    localStorage.getItem("numberOfGuesses")
      ? parseInt(localStorage.getItem("numberOfGuesses"))
      : 0
  );
  const [gameStarted, setGameStarted] = React.useState(
    localStorage.getItem("gameStarted") === "true"
  );
  const [player, setPlayer] = React.useState(
    localStorage.getItem("player")
      ? parseInt(localStorage.getItem("player"))
      : 0
  );

  React.useEffect(() => {
    localStorage.setItem(
      "guesses",
      JSON.stringify(Array.from(guesses.entries()))
    );
    localStorage.setItem("words", JSON.stringify(words));
    localStorage.setItem("guess", guess);
    localStorage.setItem("numberOfGuesses", numberOfGuesses.toString());
    localStorage.setItem("gameStarted", gameStarted.toString());
    localStorage.setItem("player", player.toString());
  }, [guesses, words, guess, numberOfGuesses, gameStarted, player]);

  const ws = new WebSocket("ws://localhost:8080");

  ws.onopen = () => {
    console.log("Connected to the WebSocket server");
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "gameStarted":
        if (words.length === 0) {
          setWords(data.words);
          setNumberOfGuesses(data.numberOfGuesses);
        }
        break;
      case "guessMade":
        if (data.turn !== player) {
          setGuesses((prevGuesses) => {
            const newGuesses = new Map(prevGuesses);
            newGuesses.set(data.guess, {
              output: data.output,
              player: data.turn,
            });
            return newGuesses;
          });
        }
        break;
      default:
        break;
    }
  };

  const handleChangeGuess = (e) => {
    let word = e.target.value;
    setGuess(word);
  };

  const handleChangeNumberOfRounds = (e) => {
    setNumberOfGuesses(e.target.value);
  };

  const handleChangeWords = (e) => {
    const inputText = e.target.value;
    const wordList = inputText.split(",").map((word) => word.trim());
    setWords(wordList);
  };

  const handleSubmitGuess = (e) => {
    e.preventDefault();
    fetch("/guess", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guess, player }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Something went wrong.");
        }
        return res.json();
      })
      .then((data) => {
        setGuesses((prevGuesses) => {
          const newGuesses = new Map(prevGuesses);
          newGuesses.set(guess.toUpperCase(), {
            output: data.output,
            player: player,
          });
          return newGuesses;
        });
        setGuess("");
        if (data.output === "00000") {
          alert("Congratulations! You won the game!");
        }
      })
      .catch((error) => {
        alert("An error occurred: " + error.message);
      });
  };

  const handleSubmitStart = (e) => {
    e.preventDefault();
    fetch("/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ numberOfGuesses, words, player }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Something went wrong.");
        }
        return res.json();
      })
      .then((data) => {
        setGameStarted(true);
        setWords(data.words);
        setNumberOfGuesses(data.numberOfGuesses);
      })
      .catch((error) => {
        alert("An error occurred: " + error.message);
      });
  };

  const handleRestart = () => {
    localStorage.clear();
    setGuesses([]);
    setWords([]);
    setGuess("");
    setNumberOfGuesses(0);
    setGameStarted(false);
    setPlayer(0);
    fetch("/restart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ player }),
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        {!gameStarted ? (
          <>
            <p>
              Please, input a maximum NUMBER of guesses and list of WORDS
              (separated by commas)
            </p>
            <form onSubmit={handleSubmitStart}>
              <div>
                <input
                  type="radio"
                  id="player1"
                  name="player"
                  value="player1"
                  checked={player === 1}
                  onChange={() => setPlayer(1)}
                />
                <label htmlFor="player1">Player 1</label>
              </div>
              <div>
                <input
                  type="radio"
                  id="player2"
                  name="player"
                  value="player2"
                  checked={player === 2}
                  onChange={() => setPlayer(2)}
                />
                <label htmlFor="player2">Player 2</label>
              </div>
              {player === 1 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <input
                    type="number"
                    onChange={handleChangeNumberOfRounds}
                    placeholder="Number of guesses"
                  />
                  <input
                    type="text"
                    onChange={handleChangeWords}
                    placeholder="List of words"
                  />
                </div>
              ) : (
                ""
              )}
              <button type="submit">Submit</button>
            </form>
          </>
        ) : (
          <>
            You are Player {player}
            <br></br>
            List of words: {words.join(", ")}
            <br></br>
            Please, input a WORD to guess
            <br></br> Remaining number of guesses:{" "}
            {numberOfGuesses - (guesses.size ?? 0)}
            <form onSubmit={handleSubmitGuess}>
              <input type="text" onChange={handleChangeGuess} value={guess} />
              <button type="submit">Submit</button>
            </form>
            <table>
              <tbody>
                {Array.from(guesses).map(([guess, { output, player }]) => (
                  <tr key={guess}>
                    <td>Player {player}:</td>
                    <td>{guess}</td>
                    <td>{output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <button onClick={handleRestart}>Restart</button>
      </header>
    </div>
  );
}

export default App;
