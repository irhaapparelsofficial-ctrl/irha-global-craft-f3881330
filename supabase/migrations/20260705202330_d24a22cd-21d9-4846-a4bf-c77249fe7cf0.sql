UPDATE public.products
SET details = (
  SELECT jsonb_agg(
    CASE
      WHEN (elem->>'label') ILIKE '%moq%' THEN jsonb_set(elem, '{value}', to_jsonb('Flexible per program'::text))
      WHEN (elem->>'label') ILIKE '%lead%time%' OR (elem->>'label') ILIKE '%delivery%'
        THEN jsonb_set(elem, '{value}', to_jsonb('Confirmed per program'::text))
      ELSE elem
    END
  )
  FROM jsonb_array_elements(details::jsonb) AS elem
)::jsonb
WHERE jsonb_typeof(details::jsonb) = 'array'
  AND (details::text ILIKE '%MOQ%' OR details::text ILIKE '%days FOB%' OR details::text ILIKE '%45-day%' OR details::text ILIKE '%38-day%');