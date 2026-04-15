const calculateETA = (orderDate) => {
    let eta = new Date(orderDate);
    const startHour = 10;
    const endHour = 18; // 6 PM
    const totalWorkingHoursNeeded = 46;

    // Adjust start time if outside working hours
    if (eta.getHours() >= endHour) {
        eta.setDate(eta.getDate() + 1);
        eta.setHours(startHour, 0, 0, 0);
    } else if (eta.getHours() < startHour) {
        eta.setHours(startHour, 0, 0, 0);
    }

    // Skip Sunday if it's the start date
    if (eta.getDay() === 0) {
        eta.setDate(eta.getDate() + 1);
        eta.setHours(startHour, 0, 0, 0);
    }

    let remainingHours = totalWorkingHoursNeeded;
    
    while (remainingHours > 0) {
        // If it's Sunday, skip to Monday
        if (eta.getDay() === 0) {
            eta.setDate(eta.getDate() + 1);
            continue;
        }

        // Calculate hours left in current day
        const currentHour = eta.getHours();
        const hoursLeftToday = endHour - currentHour;

        if (remainingHours <= hoursLeftToday) {
            eta.setHours(currentHour + remainingHours);
            remainingHours = 0;
        } else {
            remainingHours -= hoursLeftToday;
            eta.setDate(eta.getDate() + 1);
            eta.setHours(startHour, 0, 0, 0);
        }
    }

    return eta;
};

module.exports = { calculateETA };
