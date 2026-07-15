// run with `npm run seed` - reads every json file in this folder and inserts it, resolving the
// human-readable references (languageCode, levelName, conceptIndex...) into real Mongo ObjectIds
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcrypt'
import connectDB from '../config/mongodb.js'

import User from '../models/User.js'
import Branch from '../models/Branch.js'
import Language from '../models/Language.js'
import Level from '../models/Level.js'
import Pricing from '../models/Pricing.js'
import Concept from '../models/Concept.js'
import WordForm from '../models/WordForm.js'
import Translation from '../models/Translation.js'
import Curriculum from '../models/Curriculum.js'
import VocabExercise from '../models/VocabExercise.js'
import GrammarExercise from '../models/GrammarExercise.js'
import ReadingText from '../models/ReadingText.js'
import ReadingExercise from '../models/ReadingExercise.js'
import Exam from '../models/Exam.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf-8'))

const run = async () => {
    await connectDB()

    // branches and languages have no foreign refs, insert as-is (skip if already seeded)
    for (const branch of readJson('branches.json')) {
        await Branch.findOneAndUpdate({ name: branch.name }, branch, { upsert: true })
    }
    for (const language of readJson('languages.json')) {
        await Language.findOneAndUpdate({ code: language.code }, language, { upsert: true })
    }

    const branches = await Branch.find({})
    const firstBranch = branches[0]

    const languages = await Language.find({})
    const languageIdByCode = Object.fromEntries(languages.map(l => [l.code, l._id]))

    for (const level of readJson('levels.json')) {
        await Level.findOneAndUpdate(
            { languageId: languageIdByCode[level.languageCode], name: level.name },
            { languageId: languageIdByCode[level.languageCode], name: level.name, order: level.order },
            { upsert: true }
        )
    }

    const levels = await Level.find({})
    const levelIdByKey = Object.fromEntries(levels.map(l => [`${l.languageId}:${l.name}`, l._id]))
    const levelId = (languageCode, levelName) => levelIdByKey[`${languageIdByCode[languageCode]}:${levelName}`]

    // pricing per course - referenced when a payment is recorded against a student's course
    for (const item of readJson('pricing.json')) {
        await Pricing.findOneAndUpdate(
            { languageId: languageIdByCode[item.languageCode], levelId: levelId(item.languageCode, item.levelName) },
            { languageId: languageIdByCode[item.languageCode], levelId: levelId(item.languageCode, item.levelName), monthlyPrice: item.monthlyPrice },
            { upsert: true }
        )
    }

    const beginnerEnglishLevelId = levelId('en', 'Beginner')

    // one login per role, all password "test1234" - change these before going anywhere near production.
    // the seed student has NO payment yet and IS assigned a course (English Beginner), so you can
    // test the full "record payment -> activates once it covers the course price" flow immediately.
    const seedUsers = [
        { name: 'Director', phone: '+998900000001', role: 'director', branchId: null },
        { name: 'Admin (26 Mkr)', phone: '+998900000002', role: 'admin', branchId: firstBranch?._id },
        { name: 'Teacher (26 Mkr)', phone: '+998900000003', role: 'teacher', branchId: firstBranch?._id },
        {
            name: 'Student (26 Mkr)', phone: '+998900000004', role: 'student', branchId: firstBranch?._id,
            courses: [{ languageId: languageIdByCode['en'], levelId: beginnerEnglishLevelId, isActive: false, balance: 0, subscriptionExpiresAt: null }],
            address: 'Tashkent, Chilanzar', geo: { lat: 41.2856, lng: 69.2034 },
        },
    ]

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash('test1234', salt)

    for (const seedUser of seedUsers) {
        await User.findOneAndUpdate(
            { phone: seedUser.phone },
            { ...seedUser, passwordHash },
            { upsert: true }
        )
    }

    // concepts have no refs, insert and keep the array order to resolve conceptIndex later
    const conceptDocs = []
    for (const concept of readJson('concepts.json')) {
        const doc = await Concept.create(concept)
        conceptDocs.push(doc)
    }

    for (const wordForm of readJson('wordForms.json')) {
        await WordForm.create({
            conceptId: conceptDocs[wordForm.conceptIndex]._id,
            languageId: languageIdByCode[wordForm.languageCode],
            word: wordForm.word,
            example: wordForm.example,
        })
    }

    for (const translation of readJson('translations.json')) {
        await Translation.create({
            conceptId: conceptDocs[translation.conceptIndex]._id,
            nativeLanguageCode: translation.nativeLanguageCode,
            text: translation.text,
        })
    }

    for (const item of readJson('curriculum.json')) {
        await Curriculum.create({
            languageId: languageIdByCode[item.languageCode],
            levelId: levelId(item.languageCode, item.levelName),
            day: item.day,
            conceptIds: item.conceptIndexes.map(i => conceptDocs[i]._id),
        })
    }

    for (const item of readJson('vocabExercises.json')) {
        await VocabExercise.create({
            languageId: languageIdByCode[item.languageCode],
            levelId: levelId(item.languageCode, item.levelName),
            day: item.day,
            type: item.type,
            conceptId: conceptDocs[item.conceptIndex]._id,
            options: item.optionIndexes.map(i => conceptDocs[i]._id),
            correct: conceptDocs[item.correctIndex]._id,
        })
    }

    for (const item of readJson('grammarExercises.json')) {
        await GrammarExercise.create({
            languageId: languageIdByCode[item.languageCode],
            levelId: levelId(item.languageCode, item.levelName),
            day: item.day,
            type: item.type,
            question: item.question,
            options: item.options,
            correct: item.correct,
        })
    }

    const readingTextDocs = []
    for (const item of readJson('readingTexts.json')) {
        const doc = await ReadingText.create({
            languageId: languageIdByCode[item.languageCode],
            levelId: levelId(item.languageCode, item.levelName),
            day: item.day,
            title: item.title,
            image: item.image,
            paragraphs: item.paragraphs,
        })
        readingTextDocs.push(doc)
    }

    for (const item of readJson('readingExercises.json')) {
        await ReadingExercise.create({
            readingTextId: readingTextDocs[item.readingTextIndex]._id,
            type: item.type,
            paragraphRef: item.paragraphRef,
            question: item.question,
            options: item.options,
            correct: item.correct,
        })
    }

    for (const item of readJson('exams.json')) {
        await Exam.create({
            languageId: languageIdByCode[item.languageCode],
            levelId: levelId(item.languageCode, item.levelName),
            passScore: item.passScore,
            questions: item.questions,
        })
    }

    console.log('seed complete')
    process.exit(0)
}

run().catch(error => {
    console.log(error)
    process.exit(1)
})
