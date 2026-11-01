import geoData from "../../../node_modules/geothai/dist/data/geo.json";

type GeoSubdistrict = {
    name_th: string;
    name_en: string;
    zip_code?: string | number;
};

type GeoDistrict = {
    name_th: string;
    name_en: string;
    subdistricts?: GeoSubdistrict[];
};

type GeoProvince = {
    code: number;
    name_th: string;
    name_en: string;
    districts?: GeoDistrict[];
};

const areas = geoData as GeoProvince[];

/**
 * The geo dataset is the single source of truth for the selectable areas.
 * `value` deliberately remains the Thai name used by the existing booking
 * state/API; only `th` and `en` are presentation labels.
 */
export const provinceOptions = areas.map((province) => ({
    value: province.name_th,
    th: province.name_th,
    en: province.name_en,
}));

export const provinces = provinceOptions.map((province) => province.value);

const normalize = (value: string) => value.trim().toLocaleLowerCase("th");

export function getProvinceLabel(value: string, locale: "th" | "en") {
    const province = areas.find((item) => normalize(item.name_th) === normalize(value));
    return locale === "en" ? province?.name_en ?? value : province?.name_th ?? value;
}

export function getProvinceSearchValues(value: string) {
    const province = areas.find((item) => normalize(item.name_th) === normalize(value));
    return [value, province?.name_th ?? "", province?.name_en ?? ""].filter(Boolean);
}

export function getAreaLabel(
    provinceValue: string,
    areaValue: string,
    level: "district" | "subdistrict",
    locale: "th" | "en",
) {
    const province = areas.find((item) => normalize(item.name_th) === normalize(provinceValue));
    const district = province?.districts?.find((item) => normalize(item.name_th) === normalize(areaValue));
    if (level === "district") return locale === "en" ? district?.name_en ?? areaValue : district?.name_th ?? areaValue;
    const subdistrict = district?.subdistricts?.find((item) => normalize(item.name_th) === normalize(areaValue));
    return locale === "en" ? subdistrict?.name_en ?? areaValue : subdistrict?.name_th ?? areaValue;
}

export function getAreaSearchValues(
    provinceValue: string,
    areaValue: string,
    level: "district" | "subdistrict",
) {
    const province = areas.find((item) => normalize(item.name_th) === normalize(provinceValue));
    const district = province?.districts?.find((item) => normalize(item.name_th) === normalize(areaValue));
    const area = level === "district"
        ? district
        : district?.subdistricts?.find((item) => normalize(item.name_th) === normalize(areaValue));
    return [areaValue, area?.name_en ?? ""].filter(Boolean);
}
