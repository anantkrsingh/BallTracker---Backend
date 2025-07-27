const mongoose = require('mongoose');
const { Schema } = mongoose;

const SquadMemberSchema = new Schema({
    id: {
        type: Number,
        required: true,
    },
    firstname: String,
    lastname: String,
    fullname: String,
    gender: {
        type: String,
        enum: ['m', 'f'], 
    },
    dateofbirth: {
        type: Date,
  set: val => (val === '0000-00-00' || !val ? null : new Date(val))
    },
    country_id: Number,
    battingstyle: String,
    bowlingstyle: String,
    image_path: String,
    resource: String,
    position: {
        id: Number,
        name: String,
        resource: String,
    },
    squad: {
        season_id: Number,
    },
    updated_at: Date
}, { _id: false });

const TeamSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
    },
    code: {
        type: String,
        required: true,
    },
    country_id: {
        type: Number,
        required: true,
    },
    image_path: {
        type: String,
    },
    name: {
        type: String,
        required: true,
    },
    national_team: {
        type: Boolean,
        default: false,
    },
    resource: {
        type: String,
    },
    squad: {
        type: [SquadMemberSchema],
        default: [],
    },
    updated_at: {
        type: Date,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Team', TeamSchema);
