'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  INTERESTS,
  LOW_SCORE,
  PILLARS,
  PILLAR_MODULE,
  QUESTIONS,
  THEMES,
  computeResult,
  type Interest,
} from '../lib/readiness/model.ts';
import type { ReadinessText } from '../lib/readiness/text.ts';

// Everything here stays on this device. Nothing is sent anywhere; saving is an explicit choice (spec-readiness).
const KEY = 'groundstead.readiness.v1';

type Saved = { answers: Record<string, string>; label: Interest | null };

function readSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Saved;
    return value && typeof value === 'object' && value.answers && typeof value.answers === 'object' ? value : null;
  } catch {
    return null;
  }
}

function writeSaved(saved: Saved): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}

function removeSaved(): boolean {
  try {
    window.localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

export default function ReadinessCheck({ text, emergencyHref }: { text: ReadinessText; emergencyHref: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [labelOverride, setLabelOverride] = useState<Interest | null>(null);
  const [notice, setNotice] = useState('');

  // Restore a saved check from this device, if there is one. Runs only in the browser.
  useEffect(() => {
    const saved = readSaved();
    if (!saved) return;
    setAnswers(saved.answers);
    setLabelOverride(saved.label);
    setSubmitted(computeResult(saved.answers).complete);
  }, []);

  const result = useMemo(() => computeResult(answers), [answers]);
  const shown = submitted && result.complete ? result : null;

  function choose(id: string, key: string) {
    setAnswers((previous) => ({ ...previous, [id]: key }));
    setSubmitted(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = computeResult(answers);
    setSubmitted(checked.complete);
    setNotice(checked.complete ? '' : text.incomplete.replace('{n}', String(checked.missing.length)));
  }

  function save() {
    const ok = writeSaved({ answers, label: labelOverride });
    setNotice(ok ? text.saved : text.noStorage);
  }

  function clear() {
    removeSaved();
    setAnswers({});
    setSubmitted(false);
    setLabelOverride(null);
    setNotice(text.cleared);
  }

  // A label the reader changes is kept with the saved check, but only if there is one.
  function changeLabel(value: Interest) {
    setLabelOverride(value);
    if (readSaved()) writeSaved({ answers, label: value });
  }

  const suggested = shown ? shown.interest : null;
  const currentLabel = labelOverride ?? suggested;

  return (
    <>
      <form onSubmit={submit}>
        {THEMES.map((theme) => (
          <section key={theme} aria-labelledby={`theme-${theme}`} className="theme">
            <h2 id={`theme-${theme}`}>{text.themes[theme]}</h2>
            {QUESTIONS.filter((q) => q.theme === theme).map((q) => {
              const copy = text.questions[q.id];
              if (!copy) return null;
              return (
                <fieldset key={q.id}>
                  <legend>{copy.prompt}</legend>
                  {q.options.map((option) => (
                    <label key={option.key} className="opt">
                      <input
                        type="radio"
                        name={q.id}
                        value={option.key}
                        checked={answers[q.id] === option.key}
                        onChange={() => choose(q.id, option.key)}
                      />{' '}
                      {copy.options[option.key]}
                    </label>
                  ))}
                </fieldset>
              );
            })}
          </section>
        ))}
        <div className="actions">
          <button type="submit">{text.submit}</button>{' '}
          <button type="button" onClick={save}>{text.save}</button>{' '}
          <button type="button" onClick={clear}>{text.clear}</button>
        </div>
      </form>

      <p role="status" aria-live="polite">{notice}</p>

      {shown ? (
        <div className="results">
          <h2>{text.scoresHeading}</h2>
          <ul className="pillars">
            {PILLARS.map((pillar) => {
              const copy = text.pillars[pillar];
              const score = shown.scores[pillar];
              const low = score < LOW_SCORE;
              return (
                <li key={pillar} data-pillar={pillar}>
                  <strong>{copy.name}.</strong>{' '}
                  <span className="score">{text.scoreLabel.replace('{n}', String(score))}</span>
                  <br />
                  {copy.sentence}
                  {low ? (
                    <>
                      <br />
                      <em>{copy.low}</em>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <section aria-labelledby="interest-title" className="result">
            <h2 id="interest-title">{text.interestHeading}</h2>
            <p>{text.interestSystem.replace('{label}', text.interest[shown.interest])}</p>
            <p>
              <label htmlFor="interest">{text.interestHeading}: </label>
              <select
                id="interest"
                value={currentLabel ?? shown.interest}
                onChange={(event) => changeLabel(event.target.value as Interest)}
              >
                {INTERESTS.map((option) => (
                  <option key={option} value={option}>
                    {text.interest[option]}
                  </option>
                ))}
              </select>
            </p>
            <p>{text.interestNote}</p>
          </section>

          <section aria-labelledby="next-title" className="result">
            <h2 id="next-title">{text.nextHeading}</h2>
            {shown.low.length === 0 ? (
              <p>{text.noLowNote}</p>
            ) : (
              <ul className="path">
                {shown.low.map((pillar) => {
                  const copy = text.pillars[pillar];
                  return (
                    <li key={pillar} data-module={PILLAR_MODULE[pillar]}>
                      <strong>{copy.name}.</strong> {copy.step} <em>{copy.module}</em>
                    </li>
                  );
                })}
              </ul>
            )}
            <h3>{text.cityHeading}</h3>
            <p>
              {text.cityText} <a href={emergencyHref}>{text.cityLink}</a>
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
