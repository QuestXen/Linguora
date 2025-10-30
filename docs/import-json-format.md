# Import JSON Format

The dashboard import accepts JSON payloads that describe one or more words to upsert into the Linguora word pool. You can upload either of the following shapes:

- An array of entries (`[{...}, {...}]`).
- An object with an `entries` or `words` array (`{ "entries": [ ... ] }`).
- A single entry object (`{ ... }`), which will be treated as a one-item array.

Each entry must include both English and German blocks:

```json
{
  "slug": "serendipity",
  "en": {
    "word": "Serendipity",
    "ipa": "ˌsɛr.ənˈdɪp.ə.ti",
    "def": "The occurrence of events by chance in a happy or beneficial way.",
    "ex": "Finding the perfect café was pure serendipity."
  },
  "de": {
    "word": "Serendipität",
    "ipa": null,
    "def": "Das zufällige Entdecken von etwas, das sich als glücklich oder nützlich erweist.",
    "ex": "Das Treffen war ein Ergebnis reiner Serendipität."
  }
}
```

### Field reference

- `slug` (string, required): lowercase letters, numbers, and dashes only. This is the identifier that links related records across the app.
- `en` (object, required):
  - `word` (string, required): the English surface word.
  - `ipa` (string or null, optional): International Phonetic Alphabet transcription. Omit or set to `null` when unavailable.
  - `def` (string, required): English definition shown to visitors.
  - `ex` (string, optional): Example sentence in English.
- `de` (object, required):
  - `word` (string, required): German surface word.
  - `ipa` (string or null, optional): IPA transcription for the German word.
  - `def` (string, required): German definition.
  - `ex` (string, optional): German example sentence.

All string values are trimmed during import. The import will reject entries that omit the German block or leave the required `word`/`def` fields empty. Optional fields (`en.ipa`, `en.ex`, `de.ipa`, `de.ex`) may be omitted.

### Sample payload with multiple entries

```json
[
  {
    "slug": "serendipity",
    "en": {
      "word": "Serendipity",
      "ipa": "ˌsɛr.ənˈdɪp.ə.ti",
      "def": "The occurrence of events by chance in a happy or beneficial way.",
      "ex": "Finding the perfect café was pure serendipity."
    },
    "de": {
      "word": "Serendipität",
      "def": "Das zufällige Entdecken von etwas, das sich als glücklich oder nützlich erweist."
    }
  },
  {
    "slug": "eloquent",
    "en": {
      "word": "Eloquent",
      "def": "Fluent or persuasive in speaking or writing.",
      "ex": "Her eloquent speech moved the audience."
    },
    "de": {
      "word": "Eloquent",
      "def": "Redegewandt oder überzeugend im Sprechen oder Schreiben.",
      "ipa": null,
      "ex": "Ihre redegewandte Präsentation überzeugte das Publikum."
    }
  }
]
```

Upload this JSON file through the **Import words (JSON)** control in the dashboard. The API will create new records or update existing entries that share the same `slug`, and the import summary will report how many words were created or updated.
