CREATE OR REPLACE FUNCTION content."searchItems"(search text, "conferenceId" uuid)
 RETURNS SETOF content."Item"
 LANGUAGE sql
 STABLE
AS $function$
WITH
    tags AS (SELECT "id" FROM "collection"."Tag" WHERE "collection"."Tag"."conferenceId" = "conferenceId" AND search <% "collection"."Tag"."name"),
    exhibitions AS (SELECT "id" FROM "collection"."Exhibition" WHERE "collection"."Exhibition"."conferenceId" = "conferenceId" AND search <% "collection"."Exhibition"."name"),
    people AS (SELECT "id" FROM "collection"."ProgramPerson" WHERE "collection"."ProgramPerson"."conferenceId" = "conferenceId" AND (search <% "collection"."ProgramPerson"."name" OR search <% "collection"."ProgramPerson"."affiliation"))
SELECT
  *
FROM
  "content"."Item"
WHERE
  "content"."Item"."conferenceId" = "conferenceId"
  AND (
    search <% ("title")
    -- OR (SELECT COUNT(*) FROM "content"."ItemTag" WHERE "content"."ItemTag"."itemId" = "content"."Item"."id" AND "content"."ItemTag"."tagId" IN tags) > 0
    -- OR (SELECT COUNT(*) FROM "content"."ItemExhibition" WHERE "content"."ItemExhibition"."itemId" = "content"."Item"."id" AND "content"."ItemExhibition"."exhibitionId" IN exhibitions) > 0
    -- OR (SELECT COUNT(*) FROM "content"."ItemProgramPerson" WHERE "content"."ItemProgramPerson"."itemId" = "content"."Item"."id" AND "content"."ItemProgramPerson"."personId" IN people) > 0
    OR (
        (SELECT COUNT(*) FROM "content"."Element"
        WHERE "content"."Element"."itemId" = "content"."Item"."id"
        AND "content"."Element"."data" @? '$[last]."data"."text"'::jsonpath
        AND search <% ("content"."Element"."data" #>> '{-1,data,text}'))
        > 0
    )
  )
ORDER BY
  similarity(search, ("title")) DESC;
$function$;
