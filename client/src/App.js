import React from "react";
import "./App.css";

function App() {
  const [output, setOutput] = React.useState(
    localStorage.getItem("output")
      ? JSON.parse(localStorage.getItem("output"))
      : []
  );
  const [guesses, setGuesses] = React.useState(
    localStorage.getItem("guesses")
      ? JSON.parse(localStorage.getItem("guesses"))
      : []
  );
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

  React.useEffect(() => {
    localStorage.setItem("output", JSON.stringify(output));
    localStorage.setItem("guesses", JSON.stringify(guesses));
    localStorage.setItem("words", JSON.stringify(words));
    localStorage.setItem("guess", guess);
    localStorage.setItem("numberOfGuesses", numberOfGuesses.toString());
    localStorage.setItem("gameStarted", gameStarted.toString());
  }, [output, guesses, words, guess, numberOfGuesses, gameStarted]);

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
      body: JSON.stringify({ guess }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Something went wrong.");
        }
        return res.json();
      })
      .then((data) => {
        setGuesses((prevGuesses) => [...prevGuesses, guess.toUpperCase()]);
        setOutput((prevOutput) => [...prevOutput, data.result]);
        setGuess("");
        if (data.result === "00000") {
          alert("Congratulations! You won the game!");
        }
      })
      .catch((error) => {
        alert("An error occurred: " + error.message);
      });
  };

  const handleSubmitNumberOfRounds = (e) => {
    e.preventDefault();
    fetch("/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ numberOfGuesses, words }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Something went wrong.");
        }
        setGameStarted(true);
      })
      .catch((error) => {
        alert("An error occurred: " + error.message);
      });
  };

  const handleRestart = () => {
    setOutput([]);
    setGuesses([]);
    setWords([]);
    setGuess("");
    setNumberOfGuesses(0);
    setGameStarted(false);
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
            <form onSubmit={handleSubmitNumberOfRounds}>
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
              <button type="submit">Submit</button>
            </form>
          </>
        ) : (
          <>
            <text> List of words: {words.join(", ")}</text>
            <text> Please, input a WORD to guess </text>
            <form onSubmit={handleSubmitGuess}>
              <input type="text" onChange={handleChangeGuess} value={guess} />
              <button type="submit">Submit</button>
            </form>
          </>
        )}
        <table>
          {output.map((element, index) => (
            <tr>
              <td>{guesses[index]}:</td>
              <td>{element}</td>
            </tr>
          ))}
        </table>
        <button onClick={handleRestart}>Restart</button>
      </header>
    </div>
  );
}

export default App;
