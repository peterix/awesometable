/*
Mějme libovolnou HTML tabulku umístěnou v dokumentu opatřenou identifikátorem id.

Vytvořte funkci v JavaScriptu s parametrem id tabulky (případně dalšími
parametry), která způsobí, že:
* Bude možné měnit šířku sloupců a řádků tabulky myší tažením za okraje buněk (podobně, jako v Excelu).
* Pokud má dále tabulka sekci záhlaví thead, tažením za buňky záhlaví lze měnit pořadí sloupců.

Toto chování musí být uživateli naznačeno pomocí vhodného tvaru kurzoru myši.
Pokud má sekce thead více řádků, pro přesouvání se uvažuje pouze první řádek.
Tažení buňky s colspan > 1 má za následek přemístění všech dotčených sloupců.
*/

supertabulka =
{
    tolerance_presunu: 10,
    sirka_ohraniceni: 5,
    dragdrop_info: new Object(),
    cursor_backup: new Object(),
    makeAwesome: function(id_tabulky)
    {
        supertabulka.dragdrop_info.zIndex = 0;
        var tabulka = document.getElementById(id_tabulky);
        var radek;
        // nas vlastni model tabulky, aby slo najit sousedni bunky
        var radky=tabulka.rows;
        // pro vsechny radky
        for(var y = 0; y < radky.length; y++)
        {
            // pro vsechny bunky v radku
            radek = tabulka.rows[y].cells;
            var radek_ = tabulka.rows[y];
            for (var x = 0; x < radek.length; x++)
            {
                radek[x].onmousedown = supertabulka.on_drag_start;
                radek[x].onmousemove = supertabulka.on_cursor_update;
                // specialni vlastnost
                radek[x].awesome_reorderable = false;
                // velikost nejde menit hlavickou, protoze colspan.
                // this is FINAL :<
                if(!up_walk(tabulka.rows[y],"THEAD"))
                    radek[x].awesome_sizeable = true;
                else
                    radek[x].awesome_sizeable = false;
            }
            // HACK: vyska bunky po nasem, protoze prohlizecum se neda verit pokud jde o vysku bunek / radku tabulek...
            // TOHLE URCITE ROZBIJI SPOUSTU VECI!
            radek_.awesome_height = parseInt(supertabulka.get_cell_height(radek[0]),10);
        }
        tabulka.sizingRow = 0;
        tabulka.sizingColumn = 0;
        tabulka.colAssign = [];
        // pokud existuhe <thead>
        if (tabulka.getElementsByTagName("THEAD").length != 0)
        {
            if(tabulka.tHead.rows.length != 0)
            {
                var hlavicky = tabulka.tHead.rows[0].cells;
                // vsechny bunky v prvnim radku <thead> se daji tahat
                for (var x = 0; x < hlavicky.length; x++)
                {
                    // specialni vlastnost
                    hlavicky[x].awesome_reorderable = true;
                }
            }
            // nalezni radek pro zmenu sirky - ne v tHead
            for(var y = 0; y < radky.length; y++)
            {
                if(!up_walk(radky[y],"THEAD"))
                {
                    tabulka.sizingRow = y;
                    break;
                }
            }
        }
    },
    dragger:
    {
        prostredek : 0,
        horni : 1,
        pravy : 2,
        dolni : 3,
        levy : 4,
        nothing : 5
    },
    dragtype:
    {
        nothing : 0,
        resize_col : 1,
        resize_row : 2,
        move_col : 3
    },
    get_cell_action: function (bunka, abs_pozice)
    {
        var result;
        if(bunka.awesome_reorderable)
        {
            result = supertabulka.dragger.prostredek;
        }
        else
        {
            result = supertabulka.dragger.nothing;
        }
        var velikost = {x : bunka.offsetWidth, y: bunka.offsetHeight};
        var pozice_e = pozice_elementu(bunka);
        var x_v_elem = abs_pozice.x - pozice_e.x;
        var y_v_elem = abs_pozice.y - pozice_e.y;
        if(bunka.awesome_sizeable)
        {
            if(x_v_elem < supertabulka.sirka_ohraniceni)
            {
                result = supertabulka.dragger.levy;
            }
            else if(x_v_elem > velikost.x - supertabulka.sirka_ohraniceni)
            {
                result = supertabulka.dragger.pravy;
            }
            else if(y_v_elem < supertabulka.sirka_ohraniceni)
            {
                result = supertabulka.dragger.horni;
            }
            else if(y_v_elem > velikost.y - supertabulka.sirka_ohraniceni)
            {
                result = supertabulka.dragger.dolni;
            }
        }
        return {x: x_v_elem, y: y_v_elem, result: result};
    },
    // presunovani kurzoru nad aktivni bunkou
    on_cursor_update: function(event, id)
    {
        var element = event.target;
        var pozice = {x: event.pageX, y: event.pageY};
        var bunka = up_walk(element, /T[DH]/);
        var caction = supertabulka.get_cell_action(bunka, pozice);

        switch(caction.result)
        {
            case supertabulka.dragger.prostredek:
                bunka.style.cursor="move";
                break;
            case supertabulka.dragger.nothing:
                bunka.style.cursor="";
                break;
            case supertabulka.dragger.levy:
                bunka.style.cursor="w-resize";
                break;
            case supertabulka.dragger.pravy:
                bunka.style.cursor="e-resize";
                break;
            case supertabulka.dragger.horni:
                bunka.style.cursor="n-resize";
                break;
            case supertabulka.dragger.dolni:
                bunka.style.cursor="s-resize";
                break;
        }
    },
    // co se stane pri zmacknuti tlacitka mysi na aktivnich bunkach
    on_drag_start: function(event, id)
    {
        var el;
        var x, y;
        var dragdrop_info = supertabulka.dragdrop_info;

        dragdrop_info.puvodni_uzel = event.target;
        var pozice = {x: event.pageX, y: event.pageY};

        dragdrop_info.puvodni_uzel = up_walk(dragdrop_info.puvodni_uzel, /T[DH]/);

        var tabulka = up_walk(dragdrop_info.puvodni_uzel, "TABLE");
        var pocatek = sloupec_na_pozici(tabulka, pozice.x);
        if (pocatek == -1)
            return;

        dragdrop_info.tabulka = tabulka;
        // co v bunce vyvolalo akci
        var dragaction = supertabulka.get_cell_action(dragdrop_info.puvodni_uzel, pozice);
        switch(dragaction.result)
        {
            case supertabulka.dragger.levy:
                dragdrop_info.pocatek = 1;
                dragdrop_info.drag_type = supertabulka.dragtype.resize_col;
                supertabulka.cursor_backup = document.body.style.cursor;
                document.body.style.cursor = "w-resize";
                break;
            case supertabulka.dragger.pravy:
                dragdrop_info.pocatek = 0;
                dragdrop_info.drag_type = supertabulka.dragtype.resize_col;
                supertabulka.cursor_backup = document.body.style.cursor;
                document.body.style.cursor = "w-resize";
                break;
            case supertabulka.dragger.prostredek:
                dragdrop_info.pocatek = pocatek;
                dragdrop_info.drag_type = supertabulka.dragtype.move_col;
                supertabulka.cursor_backup = document.body.style.cursor;
                document.body.style.cursor = "move";
                break;
            case supertabulka.dragger.horni:
                dragdrop_info.pocatek = 1;
                dragdrop_info.drag_type = supertabulka.dragtype.resize_row;
                supertabulka.cursor_backup = document.body.style.cursor;
                document.body.style.cursor = "n-resize";
                break;
            case supertabulka.dragger.dolni:
                dragdrop_info.pocatek = 0;
                dragdrop_info.drag_type = supertabulka.dragtype.resize_row;
                supertabulka.cursor_backup = document.body.style.cursor;
                document.body.style.cursor = "s-resize";
                break;
            case supertabulka.dragger.nothing:
                return;
        }
        // ulozime si puvodni pozici
        dragdrop_info.drag_start_x = pozice.x;
        dragdrop_info.drag_start_y = pozice.y;

        // a zaregistrujeme nejake ty udalosti :)
        document.addEventListener("mousemove", supertabulka.on_drag_move, true);
        document.addEventListener("mouseup",   supertabulka.on_drag_drop, true);
        event.preventDefault();
    },
    get_cell_width: function (cell)
    {
        var xreal = 0;
        if (cell.currentStyle) // IE
        {
            xreal = cell.clientWidth - parseInt(cell.currentStyle["paddingLeft"]) - parseInt(cell.currentStyle["paddingRight"]);
        }
        else if (window.getComputedStyle)
        {
            xreal = document.defaultView.getComputedStyle(cell,null).getPropertyValue("width");
        }
        return xreal;
    },
    set_cell_width: function (cell, x)
    {
        cell.style.width = x +'px';
    },
    get_cell_height: function (cell)
    {
        var yreal = 0;
        if (cell.currentStyle) // IE
        {
            yreal = cell.clientHeight - parseInt(cell.currentStyle["paddingTop"]) - parseInt(cell.currentStyle["paddingBottom"]);
        }
        else if (window.getComputedStyle)
        {
            yreal = document.defaultView.getComputedStyle(cell,null).getPropertyValue("height");
        }
        return yreal;
    },
    set_cell_height: function (cell, y)
    {
        cell.style.height = y +'px';
    },
    on_drag_move: function(event)
    {
        var x, y;
        var dragdrop_info = supertabulka.dragdrop_info;

        if (!dragdrop_info.drag_type)
        {
            return;
        }
        var pozice = {x: event.pageX, y: event.pageY};
        var pozice_tabulky = pozice_elementu(dragdrop_info.tabulka);

        // ulozime si puvodni pozici
        var dx = pozice.x - dragdrop_info.drag_start_x;
        var dy = pozice.y - dragdrop_info.drag_start_y;
        if(dragdrop_info.drag_type == supertabulka.dragtype.resize_col)
        {
            supertabulka.velikost_sloupec(dragdrop_info.tabulka, dx);
            dragdrop_info.drag_start_x = pozice.x;
        }
        else if(dragdrop_info.drag_type == supertabulka.dragtype.resize_row)
        {
            supertabulka.velikost_radek(dragdrop_info.tabulka, dy);
            dragdrop_info.drag_start_y = pozice.y;
        }
        event.preventDefault();
    },

    on_drag_drop: function(event)
    {
        document.removeEventListener("mousemove", supertabulka.on_drag_move, true);
        document.removeEventListener("mouseup", supertabulka.on_drag_drop, true);

        var dragdrop_info = supertabulka.dragdrop_info;
        if (!dragdrop_info.drag_type)
        {
            return;
        }
        // obnov kurzor
        document.body.style.cursor = supertabulka.cursor_backup;

        var pozice = {x: event.pageX, y: event.pageY};
        var pozice_tabulky = pozice_elementu(dragdrop_info.tabulka);
        if (pozice.y < pozice_tabulky.y ||
            pozice.y > pozice_tabulky.y + dragdrop_info.tabulka.offsetHeight)
        {
            return;
        }
        // ulozime si puvodni pozici
        var dx = pozice.x - dragdrop_info.drag_start_x;
        var dy = pozice.y - dragdrop_info.drag_start_y;
        switch(dragdrop_info.drag_type)
        {
            case supertabulka.dragtype.nothing:
                return;
            case supertabulka.dragtype.move_col:
                var cilovy_sloupec = sloupec_na_pozici(dragdrop_info.tabulka, pozice.x);
                if (cilovy_sloupec != -1 && cilovy_sloupec != dragdrop_info.pocatek)
                {
                    supertabulka.presun_sloupec(dragdrop_info.tabulka, dragdrop_info.pocatek, cilovy_sloupec);
                }
                break;
            case supertabulka.dragger.col_resize:
                break;
            case supertabulka.dragger.row_resize:
                break;
        }
    },

    presun_sloupec: function(table, index_zdroje, index_cile)
    {
        if(index_cile == index_zdroje)
            return;
        var hlavicky = table.tHead.rows[0].cells;
        // zjistime si sirky a realne pozice sloupcu v tabulce
        var real_idx = 0;
        var real_idx_zdroj = index_zdroje;
        var real_idx_cil = index_cile;
        var colspan_zdroj = hlavicky[index_zdroje].colSpan;
        var colspan_cil = hlavicky[index_cile].colSpan;
        // colspan ... :<
        for(var i = 0; i < hlavicky.length; i++)
        {
            if(i == index_zdroje)
            {
                real_idx_zdroj = real_idx;
            }
            if(i == index_cile)
            {
                real_idx_cil = real_idx;
            }
            real_idx += hlavicky[i].colSpan;
        }
        
        // pokud byl zdroj pred cilem, musime upravit cil
        if(real_idx_zdroj < real_idx_cil)
        {
            real_idx_cil = real_idx_cil - colspan_zdroj + colspan_cil;
        }
        // uprava sloupce pouziteho pro zmenu vysek radku
        if (table.sizingColumn == real_idx_zdroj)
            table.sizingColumn = real_idx_cil;
        else if (table.sizingColumn == real_idx_cil)
            table.sizingColumn += colspan_zdroj;
        else if (real_idx_zdroj < table.sizingColumn && table.sizingColumn < real_idx_cil)
            table.sizingColumn -= colspan_zdroj;
        else if (real_idx_cil < table.sizingColumn && table.sizingColumn < real_idx_zdroj)
            table.sizingColumn += colspan_zdroj;
        // nejdrive presuneme hlavicku (predpokladejme, ze rows[0] je hlavicka...)
        // pouzijeme neupravene indexy, protoze colspan
        var radek = table.rows[0];
        var x = radek.removeChild(radek.cells[index_zdroje]);
        if (index_cile < radek.cells.length)
        {
            radek.insertBefore(x, radek.cells[index_cile]);
        }
        else
        {
            radek.appendChild(x);
        }
        var tempRow = [];
        // pro vsechny radky s vyjimkou prvniho radku hlavicky
        for (var i = 1; i < table.rows.length; i++)
        {
            // vyber radek
            var radek = table.rows[i];
            // vezmi kazdou bunku ze zdrojovych sloupcu a odloz si ji do pomocneho pole
            for(var incol = 0; incol < colspan_zdroj; incol ++)
            {
                // kdyz takto postupne odebirame, posunuje se vse doleva, tudiz neni treba korekce real_idx_zdroj
                tempRow[incol] = radek.removeChild(radek.cells[real_idx_zdroj]);
            }
            // pokud vkladame dovnitr radku, budeme vkladat pred cilovy index
            if (real_idx_cil < radek.cells.length)
            {
                for(var incol = colspan_zdroj - 1; incol >= 0; incol --)
                {
                    radek.insertBefore(tempRow[incol], radek.cells[real_idx_cil]);
                }
            }
            else
            {
                for(var incol = 0; incol < colspan_zdroj; incol ++)
                {
                    radek.appendChild(tempRow[incol]);
                }
            }
        }
    },
    // hellish pit of scum and villainy, aneb co pouzit ke zmene sirky sloupcu,
    // kdyz na nic z toho *neni* spolehnuti (a <col> do toho vnasi akorat
    // dalsi chaos)?
    // Ja to resim tim, ze si vyberu jeden
    // radek mimo hlavicku tabulky a v tom menim sirku bunek.
    // HTML DOM je dobre API asi tak jako prouteny kos je hrncem na vareni :<
    // Hack je v tom, ze vypneme zmenu sirky u hlavickovych bunek,
    // u kterych neni zaruceno ze colspan = 1.
    velikost_sloupec: function(table, dx)
    {
        var radekIdx = table.sizingRow;
        var idxorig = supertabulka.dragdrop_info.puvodni_uzel.cellIndex;

        var origcell = supertabulka.dragdrop_info.puvodni_uzel;
        var vlevo = supertabulka.dragdrop_info.pocatek;

        var radek = table.rows[radekIdx];
        if(vlevo == 1)
        {
            if(idxorig == 0)
                return;
            origcell = radek.cells[idxorig - 1];
        }
        else
        {
            origcell = radek.cells[idxorig];
        }
        // normalni bunka
        var wleft = parseInt(supertabulka.get_cell_width(origcell),10);
        if(wleft + dx <= 0)
            return;
        supertabulka.set_cell_width(origcell,wleft + dx);
    },
    // ~_~
    velikost_radek: function(table, dy)
    {
        var origcell = supertabulka.dragdrop_info.puvodni_uzel;
        var nahore = supertabulka.dragdrop_info.pocatek;
        // radek puvodni bunky...
        var radek = up_walk(origcell,"TR");
        var idxradek = radek.rowIndex;
        // pokud tahneme za horni okraj, meni se velikost radku nad nami
        if(nahore == 1)
        {
            // tabulka.sizingRow je radek tesne pod hlavickou - nema vyznam menit jeho horni okraj
            if(idxradek == table.sizingRow)
                return;
            radek = table.rows[idxradek -1];
            origcell = radek.cells[table.sizingColumn];
        }
        // jinak naseho radku
        else
        {
            radek = table.rows[idxradek];
            origcell = radek.cells[table.sizingColumn];
        }
        // zmena velikosti prvni bunky radku
        var hleft = radek.awesome_height;
        if(hleft + dy <= 0)
            return;
        radek.awesome_height = hleft + dy;
        supertabulka.set_cell_height(origcell,hleft + dy);
    }

}

// Projdi DOM strom smerem nahoru a najdi tag daneho typu
up_walk = function(element, tag)
{
    if (element.nodeName && element.nodeName.search(tag) != -1)
        return element;
    while (element = element.parentNode)
    {
        if (element.nodeName && element.nodeName.search(tag) != -1)
            return element;
    }
    return null;
}

// Nalezni absolutni pozici zadaneho elementu
pozice_elementu = function(element, relativni)
{
    var temp_x = 0, temp_y = 0;
    do
    {
        var styl_elementu = window.getComputedStyle(element, '');
        if (styl_elementu.position == 'fixed')
        {
            temp_x = temp_x + document.body.scrollLeft + parseInt(styl_elementu.left, 10);
            temp_y = temp_y + document.body.scrollTop + parseInt(styl_elementu.top, 10);
            break;
        }
        else if (styl_elementu.position == 'relative' && relativni)
        {
            break;
        }
        else
        {
            temp_x += element.offsetLeft;
            temp_y += element.offsetTop;
        }
    } while (element = element.offsetParent);
    return {x: temp_x, y: temp_y};
}

// ktery sloupec zadane tabulky je na zadane X-ove souradnici
sloupec_na_pozici = function(tabulka, x)
{
    var hlavicka = tabulka.tHead.rows[0].cells;
    for (var i = 0; i < hlavicka.length; i++)
    {
        var pozice = pozice_elementu(hlavicka[i]);
        if (pozice.x <= x && x <= pozice.x + hlavicka[i].offsetWidth)
        {
            return i;
        }
    }
    return -1;
}


// ktery sloupec zadane tabulky je na zadane X-ove souradnici
radek_na_pozici = function(tabulka, x)
{
    var hlavicka = tabulka.tHead.rows[0].cells;
    for (var i = 0; i < hlavicka.length; i++)
    {
        var pozice = pozice_elementu(hlavicka[i]);
        if (pozice.x <= x && x <= pozice.x + hlavicka[i].offsetWidth)
        {
            return i;
        }
    }
    return -1;
}