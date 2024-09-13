import React from "react";
import "./App.css";

function App() {
  const [output, setOutput] = React.useState([]);
  const [guesses, setGuesses] = React.useState([]);
  const [words, setWords] = React.useState([]);
  const [guess, setGuess] = React.useState("");
  const [numberOfGuesses, setNumberOfGuesses] = React.useState(0);
  const [gameStarted, setGameStarted] = React.useState(false);

  const handleChangeGuess = (e) => {
    let word = e.target.value;
    setGuess(word);
  };

  const handleChangeNumberOfRounds = (e) => {
    setNumberOfGuesses(e.target.value);
  };

  const handleChangeWords = (e) => {
    const inputText = e.target.value;
    const wordList = inputText.split(',').map(word => word.trim());
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

  return (
    <div className="App">
      <header className="App-header">
        {!gameStarted ? (
          <>
            <p>
              {" "}
              Please, set a maximum NUMBER of guesses and list of WORDS
              (separated by commas){" "}
            </p>
            <form onSubmit={handleSubmitNumberOfRounds}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <input type="number" onChange={handleChangeNumberOfRounds} placeholder="Number of guesses"/>
                <input type="text" onChange={handleChangeWords} placeholder="List of words"/>
              </div>
              <button type="submit">Submit</button>
            </form>
          </>
        ) : (
          <>
            <p> Please, input a WORD to guess </p>
            <form onSubmit={handleSubmitGuess}>
              <input type="text" onChange={handleChangeGuess} value={guess} />
              <button type="submit">Submit</button>
            </form>
          </>
        )}
        <table>
            {output.map((element, index) => (
              <tr>
                <td>{guesses[index]}</td>
                <td>{element}</td>
              </tr>
            ))}
        </table>
      </header>
    </div>
  );
}

export default App;
