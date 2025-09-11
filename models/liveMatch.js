const mongoose = require('mongoose');
const { Schema } = mongoose;

const PlayerStatSchema = new Schema({
    player_id: { type: Number, required: true },
    name: { type: String, required: true },
    img: { type: String },
    strike_status: { type: Number, enum: [0, 1] }, 
    run: { type: Number, default: 0 },
    ball: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strike_rate: { type: String }
}, { _id: false });

const BowlerSchema = new Schema({
    player_id: { type: Number, required: true },
    name: { type: String, required: true },
    img: { type: String },
    run: { type: Number, default: 0 },
    maiden: { type: Number, default: 0 },
    over: { type: String }, 
    wicket: { type: Number, default: 0 },
    economy: { type: String }
}, { _id: false });

const PartnershipSchema = new Schema({
    ball: { type: Number, default: 0 },
    run: { type: Number, default: 0 }
}, { _id: false });

const ProjectedScoreSchema = new Schema({
    over: { type: Number },
    cur_rate: { type: String },
    cur_rate_score: { type: Number },
    cur_rate_1: { type: String },
    cur_rate_1_score: { type: Number },
    cur_rate_2: { type: String },
    cur_rate_2_score: { type: Number },
    cur_rate_3: { type: String },
    cur_rate_3_score: { type: Number }
}, { _id: false });

const LastWicketSchema = new Schema({
    player: { type: String },
    run: { type: String },
    ball: { type: String }
}, { _id: false });

const InningScoreSchema = new Schema({
    score: { type: Number, default: 0 },
    wicket: { type: Number, default: 0 },
    ball: { type: Number, default: 0 },
    over: { type: String }
}, { _id: false });

const LastOverSchema = new Schema({
    over: { type: Number },
    balls: [{ type: String }],
    runs: { type: Number }
}, { _id: false });


const LiveMatchSchema = new Schema({
    match_id: { type: Number, required: true, unique: true, index: true },
    series_id: { type: Number },
    is_hundred: { type: Number, enum: [0, 1] },
    match_over: { type: String },
    fav_team: { type: String },
    toss: { type: String },
    result: { type: String },
    match_type: { type: String, enum: ['T20', 'ODI', 'Test', 'T10'] },
    powerplay: { type: String },
    
    // Team Information
    team_a_id: { type: Number },
    team_a: { type: String },
    team_a_short: { type: String },
    team_a_img: { type: String },
    team_b_id: { type: Number },
    team_b: { type: String },
    team_b_short: { type: String },
    team_b_img: { type: String },

    // Live Match State
    current_inning: { type: String },
    batting_team: { type: String },
    balling_team: { type: String },
    
    // Batting and Bowling
    batsman: [PlayerStatSchema],
    bolwer: BowlerSchema,
    last_bolwer: BowlerSchema,
    partnership: PartnershipSchema,
    next_batsman: { type: String },
    yet_to_bet: [{ type: String }],
    lastwicket: LastWicketSchema,

    // Score Details
    team_a_score: { type: Map, of: InningScoreSchema }, // Handles dynamic keys like "1", "2" for innings
    team_b_score: { type: Map, of: InningScoreSchema },
    team_a_scores: { type: String }, // e.g., "22-0"
    team_a_over: { type: String },   // e.g., "3.0"
    team_b_scores: { type: String }, // e.g., "145-6"
    team_b_over: { type: String },   // e.g., "20.0"
    c_team_score: { type: Number },  // Current team score
    target: { type: Number },

    // Rates and Projections
    curr_rate: { type: String }, // Current Run Rate
    rr_rate: { type: String },   // Required Run Rate
    projected_score: [ProjectedScoreSchema],
    
    // Run/Ball Details
    need_run_ball: { type: String }, // e.g., "Uganda NEED 124 RUNS IN 17 OVERS TO WIN"
    run_need: { type: Number },
    ball_rem: { type: Number },
    
    last4overs: [LastOverSchema],
    last36ball: [{ type: String }]

}, { timestamps: true }); 

const LiveMatch = mongoose.model('LiveMatch', LiveMatchSchema);

module.exports = LiveMatch;
