# Software Requirements Specification (SRS)

**Team name:** MAG  
**Version:** ☒ First version (Week 6) ☐ Final (Week 10)  
**Last updated:** 2026-10-27

> Keep this file at `docs/SRS.md`. Keep it short and specific: every requirement should be testable.
> Requirement IDs are used in Jira tasks, commits and tests, so do not renumber them once created.
> Delete the guidance notes (lines starting with `>`) when you fill in a section.

---

## 1. Introduction

**Purpose of the system:**
The system is a web-based decision support platform that brings together the people who follow a child's development (parents and specialists such as teachers, psychologists, doctors, special education teachers and coaches) around one shared weekly schedule, task list and record of observations. An AI component summarizes the week's records for each reader according to their role. The AI only supports decisions: it never makes them and never suggests a diagnosis or treatment.

**Users of the system:**

| User type | Description |
|---|---|
| Parent | Owns the child's data, sees all of the child's records, and links or unlinks specialists. |
| Specialist | Teacher, psychologist, doctor, special education teacher or coach. Works only with the children they are linked to. |
| Child | Sees only their own tasks and schedule, and marks tasks as done. |

---

## 2. Functional Requirements

> Group requirements by module (M1–M8, same as your Jira epics). Use the format: "The system shall …".
> Priority: **Must** (required for v1.0) / **Should** (planned) / **Could** (if time allows).

### M1 – Login and roles

| ID | Requirement | Priority |
|---|---|---|
| FR-M1-01 | The system shall allow a registered user to log in with an email address and a password. | Must |
| FR-M1-02 | The system shall reject a login with a wrong email or password and show an error message. | Must |
| FR-M1-03 | The system shall take the user's role (parent, specialist or child) from the account; the user shall not choose a role at login. | Must |
| FR-M1-04 | The system shall give the user a signed JWT after a successful login and require it for every protected API request. | Must |
| FR-M1-05 | The system shall show each role only its own screens and reject API requests that the role is not allowed to make. | Must |
| FR-M1-06 | The system shall allow a logged-in user to log out. | Should |

### M2 – Linking specialists

| ID | Requirement | Priority |
|---|---|---|
| FR-M2-01 | The system shall allow a parent to link a registered specialist to their child by entering the specialist's email address and type. | Must |
| FR-M2-02 | The system shall show an error message when the entered email does not belong to a registered specialist. | Must |
| FR-M2-03 | The system shall list the specialists linked to the child (name, email and type). | Must |
| FR-M2-04 | The system shall allow a parent to unlink a specialist after a confirmation step. | Must |
| FR-M2-05 | The system shall reject every API request about a child from a specialist who is not currently linked to that child, even if the specialist's token is still valid. | Must |
| FR-M2-06 | The system shall show a specialist the list of children they are linked to. | Must |

### M3 – (module name)

| ID | Requirement | Priority |
|---|---|---|
| FR-M3-01 | | |

### M4 – Tasks

| ID | Requirement | Priority |
|---|---|---|
| FR-M4-01 | The system shall allow a parent or a linked specialist to assign a task to a child with a title, description, development area and due date. | Must |
| FR-M4-02 | The system shall reject a task without a title, development area or due date and show an error message. | Must |
| FR-M4-03 | The system shall show a child only their own tasks. | Must |
| FR-M4-04 | The system shall allow a child to mark their own task as done. | Must |
| FR-M4-05 | The system shall show the assigner the tasks they assigned, with the current status of each task. | Must |
| FR-M4-06 | The system shall show a parent all tasks of their child, with the current status of each task. | Must |

### M5 – (module name)

| ID | Requirement | Priority |
|---|---|---|
| FR-M5-01 | | |

### M6 – Documents

| ID | Requirement | Priority |
|---|---|---|
| FR-M6-01 | The system shall allow a parent or a linked specialist to upload a PDF or image file for a child. | Must |
| FR-M6-02 | The system shall reject a file that is not a PDF, JPEG or PNG and show an error message. | Must |
| FR-M6-03 | The system shall list the child's documents with their name, type, uploader and upload date. | Must |
| FR-M6-04 | The system shall allow a parent or a linked specialist to view and download a listed document. | Must |
| FR-M6-05 | The system shall hide documents from the child and reject every document request made with a child account. | Must |

### M7 – (module name)

| ID | Requirement | Priority |
|---|---|---|
| FR-M7-01 | | |

### M8 – Role-based AI summary

| ID | Requirement | Priority |
|---|---|---|
| FR-M8-01 | The system shall generate a summary of a child's tasks and specialist entries for a selected week when a parent or a linked specialist requests it. | Must |
| FR-M8-02 | The system shall use separate prompts for parent and specialist summaries. | Must |
| FR-M8-03 | The system shall label every summary "AI-generated". | Must |
| FR-M8-04 | The system shall show each summary with links to the records it is based on. | Must |
| FR-M8-05 | The system shall send the AI service only records the reader is allowed to see. | Must |
| FR-M8-06 | The system shall include in every AI prompt an instruction not to make decisions or suggest a diagnosis or treatment, and shall present summaries as suggestions. | Must |
| FR-M8-07 | The system shall not provide summaries to child accounts and shall reject summary requests made with a child account. | Must |
| FR-M8-08 | The system shall allow the reader to mark a summary as helpful or incorrect. | Should |

---

## 3. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Security | Passwords are stored only as salted hashes (e.g., bcrypt); plain-text passwords are never stored or logged. |
| NFR-02 | Security | Every request about a child is checked on the backend against the current parent/specialist–child link; hiding a button in the UI is never the only protection. |
| NFR-03 | Privacy | Only synthetic data created by the seed script is used. The AI service receives only records the reader is allowed to see, and the AI API key is kept on the backend and never pushed to GitHub. |
| NFR-04 | Testability | The AI module has a mock mode that is used in all tests and in CI. Branch coverage is at least 40% at v0.2 and at least 60% at v1.0. |
| NFR-05 | Installability | The application runs on a local computer by following the README, without any cloud deployment. |

---

## 4. Critical Flows and Acceptance Criteria

| Flow | Related requirements | Acceptance criteria |
|---|---|---|
| Flow 1: Linking and unlinking a specialist | FR-M1-01, FR-M2-01, FR-M2-04, FR-M2-05 | **Given** a logged-in parent and a registered specialist **When** the parent links the specialist by email **Then** the child appears in the specialist's list of children; **and when** the parent unlinks the specialist **Then** every request of that specialist about the child is rejected. |
| Flow 2: Assigning and completing a task | FR-M1-05, FR-M4-… | **Given** a specialist linked to a child **When** the specialist assigns a task **Then** the task appears in the child's task list; **and when** the child marks it as done **Then** the specialist sees its status as done. |
| Flow 3: Weekly AI summary | FR-M5-…, FR-M7-…, FR-M8-… | **Given** a week with tasks and specialist entries **When** the parent requests the weekly summary **Then** a summary labelled "AI-generated" is shown with links to its source records, using only records the parent is allowed to see (mock AI in tests). |

---

## 5. Use Case Diagram (optional)

> A simple diagram showing users and main use cases. You can use Mermaid (renders on GitHub) or add an image from `docs/img/`.

---

## 6. Change Log

| Date | Change | By |
|---|---|---|
| 2026-10-27 | First version: introduction, M1, M2, non-functional requirements, critical flows | Atakan Yurdasucu |
