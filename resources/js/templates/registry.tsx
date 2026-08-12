import type { ComponentType } from 'react';
import type { TemplateProps } from './types';
import Floral from './Floral';
import Curtain from './Curtain';
import Khat from './Khat';
import Songket from './Songket';
import Batik from './Batik';
import Sampul from './Sampul';
import Tirai from './Tirai';
import BungaRaya from './BungaRaya';
import Minimalis from './Minimalis';
import Pastel from './Pastel';
import Kraf from './Kraf';
import Seri from './Seri';
import Celestial from './Celestial';
import ArtDeco from './ArtDeco';
import Boho from './Boho';
import Marble from './Marble';
import Greenery from './Greenery';
import Typografi from './Typografi';
import Pelamin from './Pelamin';
import Peranakan from './Peranakan';
import Custom from './Custom';

export const TEMPLATE_COMPONENTS: Record<string, ComponentType<TemplateProps>> = {
    floral: Floral,
    curtain: Curtain,
    khat: Khat,
    songket: Songket,
    batik: Batik,
    sampul: Sampul,
    tirai: Tirai,
    bungaraya: BungaRaya,
    minimalis: Minimalis,
    pastel: Pastel,
    kraf: Kraf,
    seri: Seri,
    celestial: Celestial,
    artdeco: ArtDeco,
    boho: Boho,
    marble: Marble,
    greenery: Greenery,
    typografi: Typografi,
    pelamin: Pelamin,
    peranakan: Peranakan,
    custom: Custom,
};

export function getTemplate(key: string): ComponentType<TemplateProps> {
    return TEMPLATE_COMPONENTS[key] ?? Floral;
}
