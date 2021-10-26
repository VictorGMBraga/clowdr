CREATE VIEW "schedule"."EventPeopleWithoutAccessToRooms"
AS SELECT evt_pp FROM "schedule"."EventProgramPerson" as evt_pp
JOIN "schedule"."Event" as evt
ON      evt_pp."eventId" = evt.id
JOIN "room"."Room" as room
ON room.id = evt."roomId"
AND room."managementModeName" = 'PRIVATE'
AND NOT EXISTS (
        SELECT 1 FROM "room"."RoomPerson" as room_p
        JOIN "registrant"."Registrant" as reg
        ON room_p."roomId" = room.id
        AND reg."id" = room_p."registrantId"
    );
