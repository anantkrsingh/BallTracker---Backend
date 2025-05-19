
const Team = require('../models/team')


function parseDateOrNull(dateString) {
    return (!dateString || dateString === '0000-00-00') ? null : new Date(dateString);
}

const insertTeam = async (req, res) => {
    const teamEntries = Object.values(req.body.teams);

    const formattedTeams = teamEntries.map(team => {
        const formattedSquad = Array.isArray(team.squad)
            ? team.squad.map(player => ({
                id: player.id,
                firstname: player.firstname,
                lastname: player.lastname,
                fullname: player.fullname,
                gender: player.gender,
                dateofbirth: parseDateOrNull(player.dateofbirth),
                country_id: player.country_id,
                battingstyle: player.battingstyle,
                bowlingstyle: player.bowlingstyle,
                image_path: player.image_path,
                resource: player.resource,
                position: player.position || {},
                squad: player.squad || {},
                updated_at: parseDateOrNull(player.updated_at)
            }))
            : [];


        return {
            id: team.id,
            code: team.code,
            country_id: team.country_id,
            image_path: team.image_path,
            name: team.name,
            national_team: team.national_team,
            resource: team.resource,
            squad: formattedSquad,
            updated_at: team.updated_at ? new Date(team.updated_at) : null
        };
    });

    try {
        for (const team of formattedTeams) {
            await Team.findOneAndUpdate(
                { id: team.id },
                { $set: team },
                { upsert: true, new: true }
            );
            console.log("Updated " + team.id)
        }
        console.log('All teams saved/updated successfully.');
    } catch (error) {
        console.error('Error saving teams:', error);
    }
}

module.exports = {
    insertTeam
}