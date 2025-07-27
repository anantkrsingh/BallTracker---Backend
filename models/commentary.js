const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentarySchema = new Schema({
  commentary_id: { type: Number, required: true },
  inning: { type: Number, required: true },
  type: { type: Number, required: true },
  data: {
    title: { type: String },
    over: { type: String },
    runs: { type: String },
    wickets: { type: String },
    team: { type: String },
    team_score: { type: String },
    team_wicket: { type: String },
    batsman_1_name: { type: String },
    batsman_1_runs: { type: String },
    batsman_1_balls: { type: String },
    batsman_2_name: { type: String },
    batsman_2_runs: { type: String },
    batsman_2_balls: { type: String },
    bolwer_name: { type: String },
    bolwer_overs: { type: String },
    bolwer_maidens: { type: String },
    bolwer_runs: { type: String },
    bolwer_wickets: { type: String },
    overs: { type: String },
    wicket: { type: String },
    wides: { type: String },
    byes: { type: String },
    legbyes: { type: String },
    noballs: { type: String },
    description: { type: String }
  }
});

const Commentary = mongoose.model('Commentary', commentarySchema);

module.exports = Commentary;
